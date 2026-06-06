import sys
import os
import asyncio
import httpx

# Add backend directory to sys.path to resolve core imports
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from core.config import settings

async def run_polling():
    """Polls the Telegram getUpdates endpoint and forwards updates to the local webhook.

    This allows real-time interactive testing of the Telegram bot on localhost
    without needing public tunneling (like ngrok) or webhook registration.
    """
    if not settings.telegram_bot_token:
        print("Error: TELEGRAM_BOT_TOKEN is not set in .env")
        return

    print("====================================================================")
    print(f"Starting Telegram Long Polling Dev Helper")
    print(f"Bot Token: {settings.telegram_bot_token[:15]}...[hidden]")
    
    webhook_url = f"http://localhost:{settings.app_port}/api/v1/messaging/telegram/webhook"
    telegram_api_url = f"https://api.telegram.org/bot{settings.telegram_bot_token}"
    
    offset = 0
    
    async with httpx.AsyncClient() as client:
        # First delete any active webhook to allow getUpdates to work
        try:
            r = await client.get(f"{telegram_api_url}/deleteWebhook")
            r_json = r.json()
            if r_json.get("ok"):
                print("Any active Telegram webhook successfully cleared.")
            else:
                print(f"Warning deleting webhook: {r_json.get('description')}")
        except Exception as e:
            print(f"Warning clearing webhook: {e}")
            
        print(f"Forwarding incoming Telegram updates to: {webhook_url}")
        print("Bot is listening. Send /start or messages to your Telegram bot!")
        print("Press Ctrl+C to terminate.")
        print("====================================================================")
        
        while True:
            try:
                params = {"offset": offset, "timeout": 10}
                response = await client.get(f"{telegram_api_url}/getUpdates", params=params, timeout=12.0)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("ok"):
                        updates = data.get("result", [])
                        for update in updates:
                            update_id = update["update_id"]
                            offset = update_id + 1
                            
                            # Log incoming update details
                            msg_type = "message" if "message" in update else "callback_query" if "callback_query" in update else "unknown"
                            print(f"[Telegram] Received update {update_id} ({msg_type})")
                            
                            # Forward update to local webhook endpoint
                            try:
                                webhook_resp = await client.post(webhook_url, json=update)
                                print(f"  -> Forwarded to webhook. Status: {webhook_resp.status_code} Response: {webhook_resp.text}")
                            except Exception as forward_err:
                                print(f"  -> Error forwarding to webhook: {forward_err}")
                else:
                    print(f"Error calling getUpdates: Status {response.status_code} - {response.text}")
                    await asyncio.sleep(2)
            except httpx.RequestError as req_err:
                # Silently catch timeouts or temporary connection drops and retry
                await asyncio.sleep(1)
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Polling loop error: {e}")
                await asyncio.sleep(2)

if __name__ == "__main__":
    try:
        asyncio.run(run_polling())
    except KeyboardInterrupt:
        print("\nPolling terminated by user.")
