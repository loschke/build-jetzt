import { listExperts } from "../src/lib/assistant/list-experts"

async function run() {
  const start = performance.now()
  for (let i = 0; i < 100; i++) {
    await listExperts()
  }
  const end = performance.now()
  console.log(`Time taken (100 runs): ${(end - start).toFixed(2)}ms`)
}

run()
