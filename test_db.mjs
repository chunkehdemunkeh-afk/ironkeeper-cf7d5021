const url = 'https://bnlvrilgauiiitjajrmx.supabase.co/rest/v1/daily_logs?select=*&limit=1';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJubHZyaWxnYXVpaWl0amFqcm14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNjY4MzgsImV4cCI6MjA4ODg0MjgzOH0.m4DHWU61kzkevRSNGhNTK3dSuQHaUmDWiX8eW0vli_o';

async function test() {
  const res = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text);
}

test();
