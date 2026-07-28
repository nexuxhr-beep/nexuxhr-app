<?php
return [
  'app_url' => 'http://localhost:3000',
  'allowed_origins' => ['http://localhost:3000', 'https://nexuxhr.com', 'https://www.nexuxhr.com'],
  'db' => [
    'host' => 'localhost',
    'name' => 'CPANEL_DATABASE_NAME',
    'user' => 'CPANEL_DATABASE_USER',
    'password' => 'CPANEL_DATABASE_PASSWORD',
    'charset' => 'utf8mb4',
  ],
  'smtp' => [
    'host' => 'mail.nexuxhr.com',
    'port' => 465,
    'username' => 'noreply@nexuxhr.com',
    'password' => 'CHANGE_TO_EMAIL_PASSWORD',
    'from_email' => 'noreply@nexuxhr.com',
    'from_name' => 'NexuxHR',
  ],
  'security' => [
    'otp_minutes' => 5,
    'reset_minutes' => 120,
    'session_days' => 7,
  ],
];
