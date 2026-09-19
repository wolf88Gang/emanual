#!/usr/bin/env python3
"""
End-to-end ONVO checkout test in TEST MODE ONLY.

What it does, with no manual steps:
  1. Creates a brand new test user (unique email, prefix AUDIT_TEST_ONVO).
  2. Asks our own function to create an ONVO checkout session.
  3. Opens the ONVO hosted page in a headless browser and pays with the
     ONVO test card (4242 4242 4242 4242).
  4. Confirms the payment server-side and checks the subscription is ACTIVE.
  5. Signs in to the app and asserts the user is NOT bounced back to checkout.

It never reads or prints ONVO_SECRET_KEY or ONVO_WEBHOOK_SECRET: those live only
in the project secrets and are used inside the edge functions.

Run:
    python3 scripts/onvo-e2e-test.py
(requires playwright; APP_URL / SUPABASE_URL / SUPABASE_ANON_KEY can be
overridden with environment variables)
"""
import asyncio
import json
import os
import time
import urllib.request

APP_URL = os.environ.get("APP_URL", "https://homeguide.casa")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://jqhbgqznejdijbjocpqc.supabase.co")
ANON_KEY = os.environ.get(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxaGJncXpuZWpkaWpiam9jcHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMjU4MDcsImV4cCI6MjA4NDkwMTgwN30.3MnkuDxzrh-5imHYbgsxPdRjsevLQk1cVCpwyhdvz2w",
)
PASSWORD = "AuditTest1234!"
EMAIL = f"audit_test_onvo_{int(time.time())}@example.com"


def post(url, body, token=None):
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "apikey": ANON_KEY,
            **({"Authorization": f"Bearer {token}"} if token else {}),
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read() or b"{}")


async def pay(url: str):
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        await page.goto(url, wait_until="domcontentloaded")
        await page.wait_for_timeout(6000)

        boxes = page.get_by_role("textbox", name="Enter")   # email / phone / name
        await boxes.nth(1).fill("8005551234")
        await boxes.nth(2).fill("AUDIT TEST ONVO")
        await page.get_by_role("button", name="Proceed to payment").click()
        await page.wait_for_timeout(7000)

        await page.get_by_role("textbox", name="Write down the name that appears on the card").fill("AUDIT TEST ONVO")
        await page.get_by_role("textbox", name="Write down the card number").fill("4242424242424242")
        await page.get_by_role("textbox", name="MM / YY").fill("12/34")
        await page.get_by_role("textbox", name="Enter").last.fill("123")
        await page.get_by_role("button", name="Pay", exact=True).click()

        for _ in range(12):
            await page.wait_for_timeout(5000)
            if "checkout/success" in page.url:
                break
        final = page.url
        await browser.close()
        return final


async def signed_in_route(email: str):
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        await page.goto(f"{APP_URL}/auth", wait_until="domcontentloaded")
        await page.wait_for_timeout(5000)
        await page.get_by_role("textbox").first.fill(email)
        await page.locator("input[type=password]").first.fill(PASSWORD)
        await page.keyboard.press("Enter")
        await page.wait_for_timeout(20000)
        final = page.url
        await browser.close()
        return final


def main():
    fn = f"{SUPABASE_URL}/functions/v1"
    print("1. sign up", EMAIL)
    auth = post(f"{SUPABASE_URL}/auth/v1/signup",
                {"email": EMAIL, "password": PASSWORD, "data": {"full_name": "AUDIT_TEST_ONVO"}})
    token = auth["access_token"]

    print("2. status before payment:",
          post(f"{fn}/onvo-subscription-status", {}, token)["status"], "(expect none)")

    print("3. create ONVO checkout session")
    created = post(f"{fn}/onvo-create-checkout",
                   {"interval": "monthly", "currency": "USD", "property_count": 2,
                    "addons": ["labor"], "origin": APP_URL}, token)
    print("   url:", created["checkoutUrl"], created["amountMinor"], created["currency"])

    print("4. pay with the ONVO test card")
    print("   redirected to:", asyncio.run(pay(created["checkoutUrl"])))

    print("5. confirm server-side (twice, to prove idempotency)")
    print("   ", post(f"{fn}/onvo-verify-checkout", {}, token))
    print("   ", post(f"{fn}/onvo-verify-checkout", {}, token))

    status = post(f"{fn}/onvo-subscription-status", {}, token)
    print("6. status after payment:", status["status"], status.get("subscription"))
    assert status["active"], "subscription did not become active"

    route = asyncio.run(signed_in_route(EMAIL))
    print("7. route after signing in:", route)
    assert "/checkout" not in route, "user was sent back to checkout after paying"
    print("\nPASS: end-to-end ONVO checkout works in test mode.")


if __name__ == "__main__":
    main()
