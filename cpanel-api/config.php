<?php
return [
  'app_url' => 'http://localhost:3000',
  'allowed_origins' => ['http://localhost:3000', 'https://nexuxhr.com', 'https://www.nexuxhr.com', 'https://app.nexuxhr.com'],
  'db' => [
    'host' => 'localhost',
    'name' => 'nexuxhrc_newuser',
    'user' => 'nexuxhrc_newuser',
    'password' => 'newuser@123',
    'charset' => 'utf8mb4',
  ],
  'smtp' => [
    'host' => 'localhost',
    'port' => 465,
    'username' => 'noreply@nexuxhr.com',
    'password' => '2FpRWpI?{fU1c[Oa',
    'from_email' => 'noreply@nexuxhr.com',
    'from_name' => 'NexuxHR',
  ],
  'security' => [
    'otp_minutes' => 5,
    'reset_minutes' => 120,
    'session_days' => 7,
  ],
];
