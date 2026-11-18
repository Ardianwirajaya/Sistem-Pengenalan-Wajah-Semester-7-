How to test with docker

docker compose down -v          # wipe DB + MinIO (destroys all data)
docker compose up -d            # restart services
cd backend
php artisan migrate:fresh --seed # rebuild schema + seed
php artisan test                # confirm all tests green
php artisan serve               # start the API

In terminal from the /backend

$body = @{ email = 'admin@example.com'; password = 'password' } | ConvertTo-Json
$resp = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/auth/login' -Method Post -Body $body -ContentType 'application/json'
$token = $resp.token
