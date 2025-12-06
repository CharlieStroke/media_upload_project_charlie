const bcrypt = require('bcryptjs');

async function generarHash() {
  const password = '123456'; // puedes cambiarla
  const hash = await bcrypt.hash(password, 10);
  console.log("Hash generado:");
  console.log(hash);
}

generarHash();
