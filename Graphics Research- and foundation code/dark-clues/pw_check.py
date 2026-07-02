import sys
from playwright.sync_api import sync_playwright
index = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page()
    page.on("console", lambda msg: sys.stdout.write(msg.text + "
"))
    page.on("pageerror", lambda exc: sys.stdout.write("PAGEERROR: " + str(exc) + "
"))
    page.goto("file:///" + index.replace("\\", "/"))
    page.wait_for_timeout(3000)
    b.close()
