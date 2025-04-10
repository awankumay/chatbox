## Chatbox

Chatbox adalah widget obrolan yang ringan dan dapat disesuaikan untuk diintegrasikan ke berbagai aplikasi web. Aplikasi ini dirancang untuk memberikan antarmuka obrolan yang responsif dan mudah digunakan dengan berbagai opsi konfigurasi.

## Cara Penggunaan

Akses Demo Lokal

1. Buka browser dan kunjungi http://localhost:5000 untuk melihat demo chatbox
2. Klik ikon chat di pojok kanan bawah untuk membuka jendela obrolan
3. Coba kirim pesan untuk menguji fungsionalitas dasar (dalam demo ini, bot akan mengulang pesan yang sama sebagai respons)

Integrasi ke Aplikasi Lain

Untuk mengintegrasikan chatbox ke aplikasi web lain, tambahkan kode berikut ke halaman HTML Anda:

``` html
<script type="module">
  import ChatboxWeb from "http://URL_SERVER_ANDA/assets/js/web.js";
  
  ChatboxWeb.init({
    isEmbed: true,
    secretKey: "your-secret-key", // Ganti dengan kunci akses Anda
    baseURL: "http://URL_SERVER_ANDA", // URL ke server chatbox
    theme: {
      // Konfigurasi tema (lihat opsi di bawah)
    }
  });
</script>
```
> Catatan: Ganti URL_SERVER_ANDA dengan URL tempat Anda meng-host aplikasi chatbox.

## Opsi Konfigurasi

Chatbox menyediakan berbagai opsi konfigurasi yang dapat disesuaikan sesuai kebutuhan Anda.

Konfigurasi Utama

| Opsi       | Tipe     | Deskripsi                                             |
|------------|----------|--------------------------------------------------------|
| isEmbed    | Boolean  | Menentukan apakah chatbox di-embed di aplikasi lain   |
| secretKey  | String   | Kunci rahasia untuk autentikasi (opsional)            |
| baseURL    | String   | URL dasar ke server chatbox                           |
