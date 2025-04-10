const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os'); // Menambahkan modul os untuk mendapatkan info jaringan

const app = express();
const HOST = process.env.HOST || '0.0.0.0';  // Mendengarkan di semua interface
const PORT = process.env.PORT || 5000;  // Mengubah default port ke 3000 agar sesuai dokumentasi

// Aktifkan CORS untuk akses dari domain lain
app.use(cors());

// Serve static files dari folder public
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'demo.html'));
});

// Fungsi untuk mendapatkan semua alamat IP lokal
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const interfaceName in interfaces) {
    const interfaceInfo = interfaces[interfaceName];
    for (const info of interfaceInfo) {
      // Hanya tambahkan alamat IPv4 dan bukan loopback
      if (info.family === 'IPv4' && !info.internal) {
        addresses.push({
          interface: interfaceName,
          address: info.address
        });
      }
    }
  }
  
  return addresses;
}

app.listen(PORT, HOST, () => {
  console.log(`\n=== INFORMASI SERVER ===`);
  console.log(`Server berjalan di http://localhost:${PORT}`);
  
  // Tampilkan semua alamat IP lokal
  const localIpAddresses = getLocalIpAddresses();
  if (localIpAddresses.length > 0) {
    console.log('\nServer dapat diakses melalui alamat IP berikut:');
    localIpAddresses.forEach(ip => {
      console.log(`- http://${ip.address}:${PORT} (${ip.interface})`);
    });
  } else {
    console.log(`\nTidak ditemukan alamat IP lokal. Pastikan koneksi jaringan aktif.`);
  }
  console.log(`\n======================`);
});