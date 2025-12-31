# Panduan Kustomisasi Portfolio

Website portfolio ini dirancang dengan 2 mode kustomisasi untuk memudahkan Anda menyesuaikan dengan kebutuhan:

## 📋 Daftar Isi
- [Mode 1: Kustomisasi Mudah](#mode-1-kustomisasi-mudah-disarankan)
- [Mode 2: Kustomisasi Lanjutan](#mode-2-kustomisasi-lanjutan-100-editing)
- [Struktur Konfigurasi](#struktur-konfigurasi)
- [Tips & Trik](#tips--trik)

---

## Mode 1: Kustomisasi Mudah (Disarankan)

Mode ini sangat cocok untuk pengguna yang ingin cepat mengubah informasi website tanpa harus mengedit kode.

### Langkah-langkah:

1. **Buka file `site.config.ts`** di folder root proyek
2. **Edit informasi** sesuai kebutuhan Anda
3. **Simpan file**
4. **Jalankan** `npm run dev` untuk melihat perubahan

### Yang Dapat Dikustomisasi:

| Bagian | Deskripsi | Lokasi di Config |
|--------|-----------|------------------|
| Informasi Dasar | Nama website, deskripsi, bahasa | `siteName`, `siteDescription`, `language` |
| Informasi Pribadi | Nama, jabatan, email, lokasi | `personal` |
| Media Sosial | GitHub, LinkedIn, Twitter, dll | `social` |
| Tentang Saya | Paragraf tentang Anda, statistik | `about` |
| Keahlian | Kategori keahlian dan item | `skills` |
| Sertifikasi | Sertifikat dan pencapaian | `certifications` |
| Proyek | Daftar proyek portfolio | `projects` |
| Testimoni | Ulasan dari klien | `testimonials` |
| Blog | Artikel terbaru | `blogPosts` |
| Navigasi | Menu navigasi | `navigation` |
| Footer | Teks copyright | `footer` |

### Contoh Konfigurasi:

```typescript
// site.config.ts

const siteConfig = {
  // Informasi Dasar
  siteName: "My Portfolio",
  siteDescription: "Portfolio saya sebagai Full Stack Developer",
  language: "id",
  
  // Informasi Pribadi
  personal: {
    name: "Budi Santoso",
    initials: "BS",
    title: "Full Stack Developer",
    subtitle: "Membangun aplikasi web modern dengan teknologi terkini",
    email: "budi@email.com",
    location: {
      city: "Bandung",
      country: "Indonesia",
    },
    resumeUrl: "/cv-budi.pdf",
    availableForWork: true,
    remoteAvailable: true,
  },
  
  // Media Sosial
  social: {
    github: "https://github.com/budisantoso",
    linkedin: "https://linkedin.com/in/budisantoso",
    twitter: "https://twitter.com/budisantoso",
    // instagram: "https://instagram.com/budisantoso", // Uncomment jika ingin ditampilkan
  },
  
  // ... dan seterusnya
};
```

---

## Mode 2: Kustomisasi Lanjutan (100% Editing)

Mode ini untuk developer yang ingin kontrol penuh atas tampilan dan fungsionalitas website.

### File yang Dapat Diedit:

| File | Fungsi |
|------|--------|
| `app/page.tsx` | Halaman utama dan semua komponen |
| `app/layout.tsx` | Layout global dan metadata |
| `app/globals.css` | Styling global dan tema |
| `site.config.ts` | Data konfigurasi |

### Contoh Modifikasi:

#### 1. Mengubah Layout Section
```tsx
// app/page.tsx
// Ubah urutan section atau tambah section baru

<section id="custom-section">
  <h2>Section Baru</h2>
  {/* Konten custom Anda */}
</section>
```

#### 2. Mengubah Warna Tema
```css
/* app/globals.css */
:root {
  --background: #ffffff;
  --foreground: #171717;
  --primary: #3b82f6;  /* Tambahkan warna kustom */
}
```

#### 3. Menambah Komponen Baru
```tsx
// Buat file baru: app/components/CustomCard.tsx
export function CustomCard({ title, description }) {
  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
```

---

## Struktur Konfigurasi

### Personal (Informasi Pribadi)
```typescript
personal: {
  name: string;           // Nama lengkap
  initials: string;       // Inisial untuk avatar
  title: string;          // Jabatan/profesi
  subtitle: string;       // Tagline atau deskripsi singkat
  email: string;          // Email kontak
  location: {
    city: string;         // Kota
    country: string;      // Negara
  };
  resumeUrl: string;      // Path ke file CV
  availableForWork: boolean;  // Status ketersediaan
  remoteAvailable: boolean;   // Bersedia remote
}
```

### Social (Media Sosial)
```typescript
social: {
  github?: string;      // URL GitHub (opsional)
  linkedin?: string;    // URL LinkedIn (opsional)
  twitter?: string;     // URL Twitter (opsional)
  instagram?: string;   // URL Instagram (opsional)
  youtube?: string;     // URL YouTube (opsional)
  website?: string;     // URL Website lain (opsional)
}
```

### Skills (Keahlian)
```typescript
skills: [
  {
    icon: string;       // Emoji atau karakter ikon
    title: string;      // Judul kategori
    items: string[];    // Daftar keahlian
  }
]
```

### Projects (Proyek)
```typescript
projects: [
  {
    icon: string;           // Emoji ikon proyek
    title: string;          // Nama proyek
    description: string;    // Deskripsi proyek
    tags: string[];         // Teknologi yang digunakan
    tagColor: string;       // Warna tag (blue, green, red, dll)
    gradientFrom: string;   // Warna gradient awal
    gradientTo: string;     // Warna gradient akhir
    githubUrl?: string;     // URL repository (opsional)
    demoUrl?: string;       // URL demo live (opsional)
    internalUrl?: string;   // URL internal (opsional)
    internalLabel?: string; // Label tombol internal (opsional)
  }
]
```

### Testimonials (Testimoni)
```typescript
testimonials: [
  {
    initials: string;      // Inisial nama
    name: string;          // Nama pemberi testimoni
    role: string;          // Jabatan
    company: string;       // Perusahaan
    rating: number;        // Rating bintang (1-5)
    text: string;          // Isi testimoni
    gradientFrom: string;  // Warna gradient avatar
    gradientTo: string;    // Warna gradient avatar
  }
]
```

---

## Tips & Trik

### 1. Menambah Proyek Baru
```typescript
// Tambahkan ke array projects di site.config.ts
{
  icon: "🌐",
  title: "Proyek Baru Saya",
  description: "Deskripsi proyek yang menarik",
  tags: ["React", "TypeScript"],
  tagColor: "blue",
  gradientFrom: "blue-500",
  gradientTo: "purple-600",
  githubUrl: "https://github.com/username/repo",
  demoUrl: "https://demo.com",
}
```

### 2. Menambah Media Sosial
```typescript
// Cukup tambahkan URL di bagian social
social: {
  github: "https://github.com/username",
  linkedin: "https://linkedin.com/in/username",
  instagram: "https://instagram.com/username", // Tambahkan ini
  youtube: "https://youtube.com/@username",    // Dan ini
}
```

### 3. Mengubah Warna Proyek
Gunakan nama warna Tailwind CSS seperti:
- `blue`, `green`, `red`, `yellow`, `purple`, `pink`, `orange`, `teal`, `cyan`, `indigo`, `violet`, `emerald`, `rose`, `fuchsia`, `amber`

### 4. Upload CV
1. Simpan file CV di folder `public/`
2. Update `resumeUrl` di config:
```typescript
resumeUrl: "/nama-file-cv.pdf"
```

### 5. Menambah Keahlian Baru
```typescript
skills: [
  {
    icon: "🎯",
    title: "Kategori Baru",
    items: ["Keahlian 1", "Keahlian 2", "Keahlian 3"],
  },
  // ... kategori lainnya
]
```

---

## Bantuan

Jika Anda membutuhkan bantuan lebih lanjut:
1. Baca dokumentasi Next.js: https://nextjs.org/docs
2. Baca dokumentasi Tailwind CSS: https://tailwindcss.com/docs
3. Buat issue di repository ini

---

**Selamat mengkustomisasi portfolio Anda! 🚀**
