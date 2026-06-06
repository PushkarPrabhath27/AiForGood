import os
import sys
import time
from pathlib import Path

# Ensure dependencies are available
try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:
    print("Error: 'boto3' is not installed. Please run: pip install boto3")
    sys.exit(1)

# Locate project files
backend_dir = Path(__file__).resolve().parents[1]
root_dir = backend_dir.parent
env_path = root_dir / ".env"

def load_env_credentials():
    credentials = {}
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    credentials[k.strip()] = v.strip()
    return credentials

def update_env_file(updates):
    lines = []
    existing_keys = set()
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        for line in lines:
            if line.strip() and not line.strip().startswith("#") and "=" in line:
                k, _ = line.split("=", 1)
                existing_keys.add(k.strip())
                
    new_lines = []
    # Update existing lines in place (retains comments/order)
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in line:
            k, v = stripped.split("=", 1)
            k = k.strip()
            if k in updates:
                new_lines.append(f"{k}={updates[k]}\n")
                del updates[k]
                continue
        new_lines.append(line)
        
    # Append new keys if they aren't already in the file
    if updates:
        new_lines.append("\n# === AWS Auto-generated Settings ===\n")
        for k, v in updates.items():
            new_lines.append(f"{k}={v}\n")
            
    with open(env_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f"Updated .env file at {env_path}")

def get_or_create_security_group(ec2_client):
    """
    Ensures that a security group permitting inbound TCP 5432 exists
    so that RDS is reachable externally during the hackathon.
    """
    sg_name = "raktasetu-rds-sg"
    try:
        # Find default VPC
        vpcs = ec2_client.describe_vpcs(Filters=[{'Name': 'is-default', 'Values': ['true']}])
        if not vpcs['Vpcs']:
            vpcs = ec2_client.describe_vpcs()
        if not vpcs['Vpcs']:
            print("No VPCs found in region. Cannot create security group.")
            return None
        vpc_id = vpcs['Vpcs'][0]['VpcId']
        print(f"Target VPC detected: {vpc_id}")

        # Check if SG exists
        try:
            sgs = ec2_client.describe_security_groups(GroupNames=[sg_name])
            sg_id = sgs['SecurityGroups'][0]['GroupId']
            print(f"Found existing Security Group: {sg_name} ({sg_id})")
            return sg_id
        except ClientError as e:
            if e.response['Error']['Code'] == 'InvalidGroup.NotFound':
                print(f"Creating Security Group: {sg_name}...")
                sg_resp = ec2_client.create_security_group(
                    GroupName=sg_name,
                    Description="Allow inbound access on port 5432 to RaktaSetu RDS",
                    VpcId=vpc_id
                )
                sg_id = sg_resp['GroupId']
                print(f"Security Group created: {sg_id}")
                
                # Authorize ingress rule
                ec2_client.authorize_security_group_ingress(
                    GroupId=sg_id,
                    IpPermissions=[
                        {
                            'IpProtocol': 'tcp',
                            'FromPort': 5432,
                            'ToPort': 5432,
                            'IpRanges': [{'CidrIp': '0.0.0.0/0', 'Description': 'Allow PostgreSQL access from anywhere'}]
                        }
                    ]
                )
                print("Authorized inbound TCP 5432 traffic from 0.0.0.0/0.")
                return sg_id
            else:
                raise e
    except Exception as e:
        print(f"Warning setting up security group: {e}. Defaulting to VPC standard.")
        return None

def setup_aws_infra():
    print("Initiating AWS Infrastructure Provisioning in us-east-1...")
    
    # Load credentials
    creds = load_env_credentials()
    aws_access_key = os.environ.get("AWS_ACCESS_KEY_ID") or creds.get("AWS_ACCESS_KEY_ID")
    aws_secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY") or creds.get("AWS_SECRET_ACCESS_KEY")
    
    session_params = {"region_name": "us-east-1"}
    if aws_access_key and aws_secret_key:
        session_params["aws_access_key_id"] = aws_access_key
        session_params["aws_secret_access_key"] = aws_secret_key
        print("Using AWS credentials from environment/dotenv.")
    else:
        print("Error: AWS credentials not found in environment or .env file.")
        sys.exit(1)

    try:
        session = boto3.Session(**session_params)
        sts = session.client('sts')
        caller = sts.get_caller_identity()
        print(f"Authenticated successfully as: {caller['Arn']}")
    except Exception as e:
        print(f"\nAuthentication Failed: {str(e)}")
        sys.exit(1)

    # AWS clients
    rds = session.client('rds')
    cognito = session.client('cognito-idp')
    dynamodb = session.client('dynamodb')
    secrets = session.client('secretsmanager')
    ec2 = session.client('ec2')

    env_updates = {}
    env_updates["AWS_REGION"] = "us-east-1"
    env_updates["AWS_DEFAULT_REGION"] = "us-east-1"

    # Set up Security Group first
    sg_id = get_or_create_security_group(ec2)

    # 1. Cognito User Pool Provisioning
    pool_id = None
    client_id = None
    try:
        print("Creating Cognito User Pool: raktasetu-users...")
        pool_resp = cognito.create_user_pool(
            PoolName="raktasetu-users",
            Policies={
                'PasswordPolicy': {
                    'MinimumLength': 8,
                    'RequireUppercase': True,
                    'RequireLowercase': True,
                    'RequireNumbers': True,
                    'RequireSymbols': False
                }
            },
            AutoVerifiedAttributes=['email'],
            UsernameAttributes=['email']
        )
        pool_id = pool_resp['UserPool']['Id']
        print(f"Cognito User Pool created: {pool_id}")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceInUseException' or "already exists" in str(e):
            print("Cognito User Pool already exists. Fetching configuration...")
            pools = cognito.list_user_pools(MaxResults=50)
            for p in pools.get('UserPools', []):
                if p['Name'] == 'raktasetu-users':
                    pool_id = p['Id']
                    break
        if not pool_id:
            print(f"Failed to create or find user pool: {e}")
            sys.exit(1)

    env_updates["AWS_COGNITO_USER_POOL_ID"] = pool_id

    # Cognito App Client
    try:
        print("Creating Cognito User Pool Client...")
        client_resp = cognito.create_user_pool_client(
            UserPoolId=pool_id,
            ClientName="raktasetu-frontend",
            GenerateSecret=False,
            ExplicitAuthFlows=['ALLOW_USER_PASSWORD_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH']
        )
        client_id = client_resp['UserPoolClient']['ClientId']
        print(f"Cognito App Client created: {client_id}")
    except ClientError as e:
        clients = cognito.list_user_pool_clients(UserPoolId=pool_id, MaxResults=50)
        for c in clients.get('UserPoolClients', []):
            if c['ClientName'] == 'raktasetu-frontend':
                client_id = c['ClientId']
                break
        if not client_id:
            print(f"Failed to create or find app client: {e}")
            sys.exit(1)

    env_updates["AWS_COGNITO_CLIENT_ID"] = client_id

    # 2. DynamoDB Table Provisioning
    table_name = "DonorCompatibilityEdges"
    try:
        print(f"Creating DynamoDB Table: {table_name}...")
        dynamodb.create_table(
            TableName=table_name,
            AttributeDefinitions=[
                {'AttributeName': 'donor_id', 'AttributeType': 'S'},
                {'AttributeName': 'patient_id', 'AttributeType': 'S'},
                {'AttributeName': 'blood_type', 'AttributeType': 'S'},
                {'AttributeName': 'city_code', 'AttributeType': 'S'}
            ],
            KeySchema=[
                {'AttributeName': 'donor_id', 'KeyType': 'HASH'},
                {'AttributeName': 'patient_id', 'KeyType': 'RANGE'}
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'blood_type-city_code-index',
                    'KeySchema': [
                        {'AttributeName': 'blood_type', 'KeyType': 'HASH'},
                        {'AttributeName': 'city_code', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'}
                }
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        print(f"DynamoDB Table {table_name} creation initiated.")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceInUseException':
            print(f"DynamoDB Table {table_name} already exists.")
        else:
            print(f"Failed to create DynamoDB table: {e}")
            sys.exit(1)

    env_updates["AWS_DYNAMODB_TABLE_COMPATIBILITY"] = table_name

    # 3. Amazon RDS PostgreSQL Instance Provisioning
    db_id = "raktasetu-db"
    db_password = creds.get("POSTGRES_PASSWORD") or "raktasetu_password_2026_secure"
    db_user = "raktasetu_admin"
    db_name = "raktasetu"
    
    endpoint_address = None
    rds_params = {
        "DBInstanceIdentifier": db_id,
        "DBInstanceClass": "db.t3.micro",
        "Engine": "postgres",
        "EngineVersion": "16.3",
        "MasterUsername": db_user,
        "MasterUserPassword": db_password,
        "AllocatedStorage": 20,
        "DBName": db_name,
        "PubliclyAccessible": True
    }
    if sg_id:
        rds_params["VpcSecurityGroupIds"] = [sg_id]

    try:
        print(f"Creating RDS PostgreSQL instance: {db_id} (Note: Provisioning takes 8-12 minutes)...")
        rds.create_db_instance(**rds_params)
    except ClientError as e:
        if e.response['Error']['Code'] == 'DBInstanceAlreadyExists':
            print("RDS instance already exists.")
        else:
            print(f"Failed to create RDS instance: {e}")
            sys.exit(1)

    # Poll RDS status until it's available to retrieve endpoint address
    print("Waiting for RDS PostgreSQL to become available (polling every 20s)...")
    loop_count = 0
    while True:
        try:
            resp = rds.describe_db_instances(DBInstanceIdentifier=db_id)
            status = resp['DBInstances'][0]['DBInstanceStatus']
            loop_count += 1
            print(f"RDS Status Check #{loop_count}: {status}")
            if status == "available":
                endpoint_address = resp['DBInstances'][0]['Endpoint']['Address']
                print(f"RDS Available at: {endpoint_address}")
                break
            elif status in ["failed", "deleting"]:
                print(f"RDS creation failed with status: {status}")
                sys.exit(1)
        except Exception as e:
            print(f"Error checking status: {e}")
        time.sleep(20)

    # Construct Connection Strings
    env_updates["AWS_RDS_HOST"] = endpoint_address
    env_updates["AWS_RDS_PORT"] = "5432"
    env_updates["AWS_RDS_DATABASE"] = db_name
    env_updates["AWS_RDS_USER"] = db_user
    env_updates["AWS_RDS_PASSWORD"] = db_password
    
    env_updates["DATABASE_URL"] = f"postgresql+asyncpg://{db_user}:{db_password}@{endpoint_address}:5432/{db_name}"
    env_updates["DATABASE_URL_SYNC"] = f"postgresql://{db_user}:{db_password}@{endpoint_address}:5432/{db_name}"

    # 4. Save credentials to AWS Secrets Manager
    try:
        print("Saving credentials to Secrets Manager...")
        secrets.create_secret(
            Name="raktasetu/db-password",
            Description="RaktaSetu RDS password details",
            SecretString=f'{{"username": "{db_user}", "password":"{db_password}", "host": "{endpoint_address}"}}'
        )
        print("Credentials saved successfully.")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceExistsException':
            print("Credentials secret already exists in Secrets Manager. Updating value...")
            try:
                secrets.put_secret_value(
                    SecretId="raktasetu/db-password",
                    SecretString=f'{{"username": "{db_user}", "password":"{db_password}", "host": "{endpoint_address}"}}'
                )
                print("Secrets manager successfully updated.")
            except Exception as update_err:
                print(f"Warning: Failed to update secret: {update_err}")
        else:
            print(f"Secrets manager warning: {e}")

    # Save to env file
    update_env_file(env_updates)
    print("\nInfrastructure provisioning completed successfully!")
    print("Next Step: run Phase 3 database migrations and seeding script.")

if __name__ == "__main__":
    setup_aws_infra()
