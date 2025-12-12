
from playwright.sync_api import sync_playwright

def verify_app():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # The base path is /subpad-pro/
            page.goto("http://localhost:3000/subpad-pro/")
            # Wait for something that is rendered by React, e.g., "Timeline Editor"
            page.wait_for_selector("text=Timeline Editor", timeout=10000)
            page.screenshot(path="verification/app_screenshot.png")
            print("Screenshot taken successfully")
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_screenshot.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_app()
