import sys
from playwright.sync_api import sync_playwright
index = r"file:///J:/BKU/New folder/dark-clues/index.html"
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on('console', lambda msg: sys.stdout.write(msg.text + "\n"))
    page.on('pageerror', lambda exc: sys.stdout.write("PAGEERROR: " + str(exc) + "\n"))
    page.goto(index)
    page.wait_for_timeout(4000)
    browser.close()
