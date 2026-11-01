# ie310
A shared repo for IE 310, Fall 2026
﻿# WNY Auto Rentals

## Start Phase 1 on Windows

From PowerShell in this folder, run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\start-wny.ps1
```

Or double-click `Start-WNY-Auto-Rentals.cmd`.

Open the laptop app at:

`http://localhost:8765/`

The launcher prints the iPhone URL. Connect the iPhone and laptop to the same private Wi-Fi or hotspot, then open the printed `http://<laptop-ip>:8765/` address in Safari. Keep the PowerShell window open while using the app.

Phase 1 stores data in the browser’s local IndexedDB and provides encrypted backup/import, CSV export, renter and vehicle records, weekly rental billing, late-payment calculations, PDF-printable receipts, and copyable text receipts.
