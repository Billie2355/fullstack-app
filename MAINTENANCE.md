# מדריך תחזוקה — fullstack-app

אפליקציית מנהל משימות (React + Node/Express) על AWS EC2, עם פיצ'ר נסתר של הורדת שירים מ‑YouTube ל‑Google Drive.

---

## סקירת תשתית מהירה

| רכיב | פרטים |
|------|-------|
| שרת | AWS EC2, Ubuntu. ה‑Public IP עלול להשתנות ב‑stop/start — מומלץ Elastic IP. |
| nginx | מאזין על פורט 80, מנתב `/api` → `localhost:4000` |
| Backend | Node + Express, רץ כ‑systemd service בשם `node-service` (פורט 4000, כ‑root) |
| Frontend | React/Vite, מוגש מ‑`/var/www/html` |
| CI/CD | push ל‑`main` → GitHub Actions → SSH ל‑EC2 → `git pull` + build + `restart node-service` |
| אחסון משימות | בזיכרון בלבד (מתאפס בכל restart) |
| דיסק | EBS root (הוגדל ל‑16GB). swap של 2GB ב‑`/swapfile`. |

מבנה על המכונה: הקוד ב‑`/home/ubuntu/fullstack-app/`, תוצר ה‑build ב‑`/var/www/html/`, מצב/סודות הפיצ'ר ב‑`/home/ubuntu/youtube-feature/`.

---

## התחברות לשרת

SSH רגיל:
```
ssh -i <path-to-key.pem> ubuntu@<server-ip>
```

אם SSH נחסם (נפוץ ברשתות עבודה / Zscaler על פורט 22 — שגיאת `kex_exchange_identification: Connection closed`):
EC2 Console → Instances → `app-main-server` → **Connect** → **EC2 Instance Connect** → Connect. זה SSH מהדפדפן דרך HTTPS, עוקף את החסימה.

---

## דיפלוי

- **אוטומטי:** merge/push ל‑`main` מריץ את ה‑GitHub Action שפורס לשרת.
- **ידני על השרת** (אם צריך):
  ```
  cd /home/ubuntu/fullstack-app && git pull
  (cd backend && npm install)
  (cd frontend && npm install && npm run build)
  sudo cp -r frontend/dist/* /var/www/html/
  sudo systemctl restart node-service
  ```

---

## ניהול ה‑service

```
sudo systemctl status node-service --no-pager   # סטטוס
sudo systemctl restart node-service             # הפעלה מחדש
sudo journalctl -u node-service -n 100 --no-pager  # לוגים של ה-service
```

---

## הפיצ'ר הנסתר: YouTube → Drive

**איך עובד:** מדביקים לינק YouTube נקי בשדה המשימה ולוחצים "הוסיפי" → הלינק "נבלע" (לא נשמר כמשימה) → השיר יורד כ‑mp3 בענן → מועלה לתיקייה **"שירים מיוטיוב"** בדרייב. עד שהסודות מוגדרים הפיצ'ר רדום ולינק פשוט נהיה משימה רגילה.

- קוד: `backend/youtube/` (פירוט מלא ב‑`backend/youtube/README.md`)
- לוג הפיצ'ר: `/home/ubuntu/youtube-feature/youtube.log`
- סודות/קונפיג: `/home/ubuntu/youtube-feature/secrets.env` (נטען ע"י systemd `EnvironmentFile`, לא נמצא ב‑git)
- קבצים זמניים: `/home/ubuntu/youtube-feature/tmp/` — כל שיר נמחק אוטומטית אחרי העלאה

**רכיבי host (מותקנים חד‑פעמית, לא דרך CI/CD):**
- `ffmpeg`, `yt-dlp` (`/usr/local/bin`)
- `deno` (`/usr/local/bin`) — לפתירת אתגרי ה‑JS של YouTube
- provider של bgutil ב‑Docker, מאזין על `127.0.0.1:4416`
- `cookies.txt` תקף של YouTube
- swap של 2GB (קריטי — בלעדיו deno נהרג ב‑OOM)

---

## תחזוקה שוטפת

### ריענון cookies — כל ~שבועיים (המשימה הקבועה היחידה)
כשההורדות נפסקות פתאום (בלוג: `Sign in to confirm you're not a bot` או שגיאת פורמט):
1. במחשב: תוסף "Get cookies.txt LOCALLY" בכרום, היכנסי ל‑`youtube.com` (מחוברת), **Export**.
2. בשרת (Instance Connect):
   ```
   nano /home/ubuntu/youtube-feature/cookies.txt
   ```
   הדביקי את כל התוכן החדש → שמרי → `chmod 600 /home/ubuntu/youtube-feature/cookies.txt`.

### עדכון yt-dlp (כש‑YouTube משנה משהו)
```
sudo pip install --break-system-packages -U yt-dlp bgutil-ytdlp-pot-provider
sudo systemctl restart node-service
```

### בדיקת ה‑PO token provider
```
sudo docker ps          # אמור להראות bgutil-provider
sudo docker start bgutil-provider   # אם הוא לא רץ
```

### מקום בדיסק
```
df -h /
```
אם מתמלא — נקי תיקיות `job-...` שרידיות (נשארות רק אם תהליך נהרג באמצע הורדה):
```
sudo rm -rf /home/ubuntu/youtube-feature/tmp/*
```

---

## פתרון תקלות

| תסמין | סיבה סבירה | פתרון |
|-------|-----------|-------|
| SSH: `Connection closed ... kex_exchange_identification` | רשת/Zscaler חוסמת פורט 22, או fail2ban | EC2 Instance Connect מהדפדפן, או רשת אחרת |
| `Sign in to confirm you're not a bot` / `Only images are available` | cookies פגו / IP נחסם | ריענון cookies; ודאי שה‑provider רץ |
| `Requested format is not available` + `Signature solving failed` | חסר JS runtime / סקריפטי EJS | ודאי ש‑deno ב‑PATH ושהדגל `--remote-components ejs:github` פעיל; `yt-dlp -U` |
| deno `returncode: -9` | OOM (נגמר הזיכרון) | ודאי שה‑swap פעיל: `free -h` (אמור 2GB) |
| `No space left on device` | דיסק מלא | נקי `tmp/`, או הגדילי את ה‑EBS volume ואז `growpart`+`resize2fs` |
| `PoTokenProviderRejectedRequest ... deprecated` | שם arg של PO token התיישן | עדכני את extractor-args ל‑`youtubepot-bgutilhttp:base_url` ואת הפלאגין |
| ה‑service לא עולה | שגיאת קוד / secrets חסרים | `sudo journalctl -u node-service -n 100 --no-pager` |
| לינק מופיע כמשימה רגילה במקום להיבלע | הפיצ'ר רדום (חסרים סודות) | ודאי ש‑`secrets.env` קיים ושה‑service הופעל מחדש |

### Fallback אם YouTube שובר את המסלול החינמי
רכיב ההורדה בנוי כאסטרטגיה מתחלפת. ב‑`secrets.env`:
```
YT_DOWNLOAD_STRATEGY=ytdlp-proxy
YT_PROXY_URL=http://user:pass@proxy-host:port
```
ואז `sudo systemctl restart node-service`. ספק פרוקסי residential (Webshare / Decodo וכו') עוקף את חסימת ה‑IP של ה‑Data Center.

---

## הגדלת דיסק (EBS) בעת הצורך
1. Console → EC2 → **Volumes** → בחרי את ה‑volume → Actions → **Modify volume** → הגדילי → Modify.
2. על המכונה:
   ```
   sudo growpart /dev/nvme0n1 1
   sudo resize2fs /dev/nvme0n1p1
   df -h /
   ```

---

## ניהול חשבון AWS — Free Plan ← Paid

החשבון נפתח תחת מודל ה‑Free Plan החדש (מיולי 2025). ה‑Free Plan פג במוקדם מבין: 6 חודשים מפתיחת החשבון, או כשנגמרים הקרדיטים. **כשהוא פג, AWS סוגר את החשבון וה‑EC2 נכבה** (הנתונים נשמרים 90 יום, ואז נמחקים לצמיתות אם לא משדרגים). כדי שהשירות ימשיך לרוץ ללא הפרעה — יש לשדרג ל‑Paid plan לפני תום התקופה.

### שדרוג ל‑Paid plan
1. היכנסי ל‑Console עם חשבון הבעלים (root) או משתמש עם הרשאות Billing.
2. חיפוש → **Billing and Cost Management**.
3. לחצי **Upgrade plan** (באנר/תפריט בקונסול) → **Upgrade account**.
4. הוסיפי אמצעי תשלום (כרטיס) ואשרי.

⚠️ אל תצרפי את החשבון ל‑AWS Organizations בתהליך — זה משדרג ל‑Paid אבל מפקיע את הקרדיטים מיד. אחרי שדרוג רגיל, הקרדיטים שנותרו ממשיכים לכסות שימוש עד שהם נגמרים או עד 12 חודשים מפתיחת החשבון; רק מעבר לכך יש חיוב רגיל.

### התראת תקציב
Billing and Cost Management → **Budgets** → **Create budget** → Cost budget → סכום חודשי (למשל $15) → ספי התראה (50%/80%/100%, ואפשר גם $0.01 כדי לדעת מתי הקרדיטים נגמרו) → אימייל → Create.

### הקטנת עלויות (רשות)
- EC2 → Instances: לזהות את סוג המכונה (הגורם העיקרי לעלות).
- לנקות Volumes / Snapshots / Elastic IPs שלא בשימוש.
- מכונה קטנה 24/7 + דיסק + כתובת IPv4 ציבורית ≈ $10–15 לחודש.
