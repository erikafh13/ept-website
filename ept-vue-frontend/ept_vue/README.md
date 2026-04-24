# 🎓 EPT Pro System — Vue 3

Konversi EPT System dari Streamlit ke **Vue 3 + Node.js/Express**, dengan Google Sheets sebagai database.

---

## 📁 Struktur Project

```
ept-vue/
├── src/                    # Frontend Vue 3
│   ├── views/              # Halaman utama
│   ├── components/         # Komponen reusable (Navbar, dll)
│   ├── stores/             # Pinia stores (auth, test)
│   ├── services/           # API layer (axios)
│   ├── router/             # Vue Router
│   └── assets/main.css     # Global styles
├── backend/                # Backend Node.js/Express
│   ├── routes/             # Route handlers
│   ├── sheets.js           # Google Sheets client
│   ├── server.js           # Entry point
│   └── .env.example        # Template env variables
├── vite.config.js
└── package.json
```

---

## 🚀 Setup & Menjalankan

### 1. Persiapan Google Sheets

Pastikan spreadsheet kamu memiliki sheet dengan nama:
- `Users` — kolom: username | password | name | role | phone | created_at
- `Questions` — kolom: date | type | no | question | option_a | option_b | option_c | option_d | correct | script | passage
- `Scores` — kolom: timestamp | date | username | name | listening | structure | reading | total | accuracy
- `AnswerLog` — kolom: timestamp | date | username | section | q_no | user_answer | correct_answer | is_correct
- `QuestionPool` — kolom: pool_id | type | no | question | option_a | option_b | option_c | option_d | correct | script | passage | difficulty
- `DailyDraw` — kolom: date | pool_ids

### 2. Service Account Google

1. Buka [Google Cloud Console](https://console.cloud.google.com)
2. Buat project baru / gunakan yang ada
3. Aktifkan **Google Sheets API**
4. Buat **Service Account** → download JSON key
5. Simpan sebagai `backend/service-account.json`
6. Share spreadsheet kamu ke email service account (Editor)

### 3. Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env: isi SPREADSHEET_ID dan pastikan service-account.json ada
npm install
npm run dev       # development (nodemon)
npm start         # production
```

### 4. Setup Frontend

```bash
# Di root folder ept-vue/
cp .env.example .env
# VITE_API_URL biarkan kosong untuk dev (proxy otomatis ke localhost:3000)
npm install
npm run dev       # http://localhost:5173
npm run build     # build untuk production
```

---

## 🌐 Deploy

### Backend → Railway / Render

1. Push folder `backend/` ke GitHub
2. Buat new project di [Railway](https://railway.app) atau [Render](https://render.com)
3. Set environment variables:
   - `SPREADSHEET_ID` = ID spreadsheet kamu
   - `GOOGLE_SERVICE_ACCOUNT_JSON` = isi JSON service account (paste langsung)
   - `FRONTEND_URL` = URL frontend kamu
   - `PORT` = 3000
4. Deploy!

### Frontend → Vercel / Netlify

1. Push folder `ept-vue/` (tanpa `backend/`) ke GitHub
2. Deploy di [Vercel](https://vercel.com) atau [Netlify](https://netlify.com)
3. Set environment variable:
   - `VITE_API_URL` = URL backend yang sudah di-deploy (contoh: `https://ept-backend.railway.app/api`)
4. Build command: `npm run build`
5. Output directory: `dist`

---

## 📋 Fitur

| Fitur | Status |
|---|---|
| Login / Logout | ✅ |
| Dashboard user | ✅ |
| Simulasi Test (timer 90 menit) | ✅ |
| Peta soal (navigasi bebas) | ✅ |
| Auto-submit saat waktu habis | ✅ |
| Review jawaban + rekomendasi | ✅ |
| Analitik personal (chart) | ✅ |
| Analitik admin (soal tersulit) | ✅ |
| Leaderboard | ✅ |
| Materi belajar | ✅ |
| Admin: kelola soal manual | ✅ |
| Admin: kelola user | ✅ |
| Admin: pool soal + random draw | ✅ |
| Audio TTS (Google TTS) | ✅ |
| Responsive mobile | ✅ |

---

## 🔑 Akun Default

Tambahkan user pertama langsung di sheet `Users`:
```
username | password | name  | role  | phone
admin    | admin123 | Admin | admin |
```
> Password akan otomatis di-hash bcrypt setelah login pertama jika kamu mengupdate fitur tersebut, atau hash manual menggunakan bcrypt.

---

## 🛠️ Tech Stack

- **Frontend**: Vue 3, Vite, Pinia, Vue Router, Axios, Chart.js
- **Backend**: Node.js, Express, googleapis
- **Database**: Google Sheets
- **Auth**: Username + password (bcrypt hash)
