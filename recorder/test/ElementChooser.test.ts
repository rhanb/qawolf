import { Page } from "playwright";

import { launch, LaunchResult } from "./utils";
import { QAWolfWeb } from "../src";
import { ElementChosen } from "../src/types";

let chosen: ElementChosen;
let launched: LaunchResult;
let page: Page;

beforeAll(async () => {
  launched = await launch();
  page = launched.page;

  await page.goto(
    "file://" + require.resolve("./fixtures/ElementChooser.html")
  );

  await page.evaluate(() => {
    const qawolf: QAWolfWeb = (window as any).qawolf;
    qawolf.elementChooser.start();
  });

  await launched.context.exposeBinding(
    "qawElementChosen",
    (_: Record<string, any>, value: ElementChosen) => {
      chosen = value;
    }
  );
});

afterAll(() => launched.browser.close());

async function getChooserStyle() {
  const chooser = await page.$("#qawolf-chooser");

  const style = await chooser.evaluate((element) => {
    const { background, height, left, top, width } = element.style;
    return { background, height, left, top, width };
  });

  return style;
}

it("highlights an element while hovered", async () => {
  await page.hover("input");

  expect(await getChooserStyle()).toEqual({
    background: "rgba(233, 110, 164, 0.2)",
    height: "21px",
    left: "8px",
    top: "8px",
    width: "153px",
  });
});

it("chooses an element on click", async () => {
  await page.click("select");

  expect(await getChooserStyle()).toEqual({
    background: "rgba(233, 110, 164, 0.5)",
    height: "19px",
    left: "165px",
    top: "9px",
    width: "32px",
  });

  await page.waitForTimeout(0);

  expect(chosen).toEqual({
    selectors: [
      { penalty: 15, selector: "select" },
      { penalty: 30, selector: "body select" },
      { penalty: 30, selector: "html select" },
    ],
    text: "a",
  });
});
