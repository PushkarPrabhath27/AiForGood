// frontend/lib/auth-config.ts
import { Amplify } from "aws-amplify";

export function configureAmplify() {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "mockPoolId",
        userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "mockClientId",
        loginWith: {
          email: true,
        },
      },
    },
  });
}
