const dns = require('dns');

const srvRecord = '_mongodb._tcp.cluster0.mgmfzpn.mongodb.net';

console.log(`Checking DNS for: ${srvRecord}...`);

dns.resolveSrv(srvRecord, (err, addresses) => {
    if (err) {
        console.error('DNS RESOLUTION FAILED!');
        console.error('Error Code:', err.code);
        console.error('Message:', err.message);
        console.log('\n--- DIAGNOSIS ---');
        console.log('Your ISP or Network is likely blocking SRV record lookups.');
        console.log('This is why the "mongodb+srv" connection string is failing.');
        console.log('\n--- SOLUTIONS ---');
        console.log('1. Try a different network (Mobile Hotspot usually works).');
        console.log('2. Change your DNS to Google DNS (8.8.8.8) or Cloudflare (1.1.1.1).');
        console.log('3. Use the "Standard Connection String" from Atlas (Node.js 2.2.11 or earlier).');
    } else {
        console.log('DNS RESOLUTION SUCCESSFUL!');
        console.log('Addresses found:', JSON.stringify(addresses, null, 2));
    }
});
