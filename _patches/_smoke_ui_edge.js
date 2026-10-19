// Edge 界面冒烟：用系统 Edge(headless) 打开产物，点一遍全屏/小窗笑脸，
// 断言颜文字面板 .open 出现，并确认收藏星钮/小助手 Guide 入口静态存在。
// 只把 pageerror（未捕获异常）当失败；file:// 下的 IndexedDB 等 console 报错忽略。
const path = require('path');
const { chromium } = require('playwright-core');

// 探测系统 Edge：先 x86，再 Program Files。禁止装 Chrome/Chromium。
const EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const fs = require('fs');
const EDGE = EDGE_CANDIDATES.find((p) => fs.existsSync(p));
if (!EDGE) {
  console.error('FAIL edge-not-found: 未在常见路径找到 msedge.exe');
  process.exit(1);
}

const PRODUCT =
  'file:///' +
  path.resolve(__dirname, 'out', 'InternalBeyond.patched.html').replace(/\\/g, '/');

let browser;
const failures = [];
const pageerrors = [];

function fail(step, err) {
  const msg = 'FAIL [' + step + '] ' + (err && err.message ? err.message : String(err));
  console.error(msg);
  failures.push(step + ': ' + (err && err.message ? err.message : String(err)));
}

async function main() {
  browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const page = await browser.newPage();

  page.on('pageerror', (err) => {
    const m = 'PAGEERROR: ' + (err && err.message ? err.message : String(err));
    console.error(m);
    pageerrors.push(m);
  });
  // console error 只打印，不当失败（file:// IndexedDB 等非致命）。
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('  console.error(ignored): ' + msg.text());
    }
  });

  // a. 加载产物
  try {
    await page.goto(PRODUCT, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('OK load domcontentloaded');
  } catch (e) {
    fail('load', e);
    return finish();
  }

  // a2. 进门：#splash 是启动闸门(z-index 9999)，#preloader 在更上层(z-index 100000)，
  //     二者不释放前会拦截所有指针事件。调应用自带的 enterSite()（等价点"跳过，直接探索"），
  //     再等 splash 变 .hidden、preloader 淡出/移除。
  try {
    await page.evaluate(() => { if (typeof enterSite === 'function') enterSite(); });
    await page.waitForFunction(
      () => {
        const sp = document.getElementById('splash');
        const splashGone = !sp || sp.classList.contains('hidden');
        const pre = document.getElementById('preloader');
        const preGone = !pre || pre.classList.contains('fade-out');
        return splashGone && preGone;
      },
      { timeout: 12000 }
    );
    console.log('OK splash/preloader dismissed');
  } catch (e) {
    fail('dismiss-gate', e);
    return finish();
  }

  // b. 全屏笑脸
  try {
    await page.evaluate(() => navTo('chat'));
    await page.waitForSelector('#ib-kp-btn-full', { state: 'visible', timeout: 10000 });
    console.log('OK #ib-kp-btn-full visible');
    await page.click('#ib-kp-btn-full');
    await page.waitForSelector('#ib-kao-panel.open', { state: 'visible', timeout: 5000 });
    const openFull = await page.$('#ib-kao-panel.open');
    if (!openFull) throw new Error('#ib-kao-panel.open 未出现');
    console.log('OK fullscreen kao panel opened');
  } catch (e) {
    fail('fullscreen-smiley', e);
  }

  // 复位面板：必须走 _kpClose()（它同时重置内部状态 _kp.open=false），
  // 手动 remove('.open') 会让 _kp.open 仍为 true，下次点击被 toggle 成关闭。
  try {
    await page.evaluate(() => { if (typeof _kpClose === 'function') _kpClose(); });
  } catch (e) {
    fail('reset-panel', e);
  }

  // c. 小窗笑脸
  try {
    await page.evaluate(() => openChatPanel());
    await page.waitForSelector('#ib-kp-btn-mini', { state: 'visible', timeout: 10000 });
    console.log('OK #ib-kp-btn-mini visible');
    await page.click('#ib-kp-btn-mini');
    await page.waitForSelector('#ib-kao-panel.open', { state: 'visible', timeout: 5000 });
    const openMini = await page.$('#ib-kao-panel.open');
    if (!openMini) throw new Error('#ib-kao-panel.open 未出现');
    console.log('OK mini kao panel opened');
  } catch (e) {
    fail('mini-smiley', e);
  }

  // d. 静态存在：收藏星钮 ×2、小助手/Guide 入口（#ws-a-fab，boot 时注入 fab-dock）
  for (const sel of ['#fav-open-full', '#fav-open-mini', '#ws-a-fab']) {
    try {
      const n = await page.$$(sel);
      if (n.length === 0) throw new Error(sel + ' 不存在');
      console.log('OK exists ' + sel + ' (x' + n.length + ')');
    } catch (e) {
      fail('static-exists ' + sel, e);
    }
  }

  // e. pageerror
  if (pageerrors.length) {
    fail('pageerror', new Error('共 ' + pageerrors.length + ' 个未捕获异常'));
  }

  return finish();
}

function finish() {
  if (failures.length) {
    console.error('---');
    console.error('FAIL edge-ui-smoke: ' + failures.length + ' 项失败');
    for (const f of failures) console.error('  - ' + f);
    process.exitCode = 1;
  } else {
    console.log('PASS edge-ui-smoke (pageerror=' + pageerrors.length + ')');
    process.exitCode = 0;
  }
}

main()
  .catch((e) => {
    console.error('FAIL unexpected: ' + (e && e.stack ? e.stack : e));
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('browser.close 异常(忽略): ' + e.message);
      }
    }
  });
