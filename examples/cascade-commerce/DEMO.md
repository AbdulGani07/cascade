# Recording script

Target length: 55–75 seconds at 1440×900. Use a 20–22 px terminal font and keep
the browser at 100% zoom.

1. Run `node examples/cascade-commerce/scripts/setup-demo.mjs`.
2. Run
   `node packages/cli/dist/index.js analyze .cascade-demo --compact --no-color`.
3. Hold on the summary for three seconds.
4. Run `node packages/cli/dist/index.js dashboard .cascade-demo --base demo-base --head pr/new-cycle`.
5. In the dashboard, choose **Hotspots** and select
   `packages/contracts/src/order.ts`.
6. Choose **Pull request** to show the `demo-base...pr/new-cycle`
   comparison.
7. Choose **Affected tests**.
8. Choose **Architecture** and show `domain-must-not-import-web`.
9. Return to the terminal and run
   `node examples/cascade-commerce/scripts/fix-architecture.mjs`.
10. Run
    `node packages/cli/dist/index.js governance .cascade-demo --format terminal`
    and hold on the empty table: the architecture policy is now clean.

The baseline cycle, dead file, and unresolved import remain intentional, so the
final “clean” result refers specifically to the architecture policy. Do not
present it as a zero-finding whole-repository scan.

For a terminal-only rehearsal, run
`powershell -File examples/cascade-commerce/scripts/demo.ps1`.
