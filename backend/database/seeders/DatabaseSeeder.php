<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Student;
use App\Models\Course;
use App\Models\Kelas;
use App\Models\ClassSchedule;
use App\Models\MlModel;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Users
        User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin Sistem',
                'password' => 'password',
                'role' => 'admin',
                'is_active' => true,
            ]
        );

        User::firstOrCreate(
            ['email' => 'budi@example.com'],
            [
                'name' => 'Dr. Budi Santoso',
                'password' => 'password',
                'role' => 'dosen',
                'is_active' => true,
            ]
        );

        User::firstOrCreate(
            ['email' => 'siti@example.com'],
            [
                'name' => 'Ir. Siti Nurhaliza',
                'password' => 'password',
                'role' => 'dosen',
                'is_active' => true,
            ]
        );

        // 2. Courses
        $algo = Course::firstOrCreate(['code' => 'IF101'], ['name' => 'Algoritma & Pemrograman', 'sks' => 3, 'is_active' => true]);
        $db   = Course::firstOrCreate(['code' => 'IF201'], ['name' => 'Basis Data', 'sks' => 3, 'is_active' => true]);
        $web  = Course::firstOrCreate(['code' => 'IF301'], ['name' => 'Pemrograman Web', 'sks' => 3, 'is_active' => true]);

        // 3. Classes
        $if1a = Kelas::firstOrCreate(
            ['course_id' => $algo->id, 'name' => 'IF-1A', 'academic_year' => '2025/2026'],
            ['semester' => 1, 'is_active' => true]
        );

        $if2a = Kelas::firstOrCreate(
            ['course_id' => $db->id, 'name' => 'IF-2A', 'academic_year' => '2025/2026'],
            ['semester' => 3, 'is_active' => true]
        );

        $if3a = Kelas::firstOrCreate(
            ['course_id' => $web->id, 'name' => 'IF-3A', 'academic_year' => '2025/2026'],
            ['semester' => 5, 'is_active' => true]
        );

        // 4. Class schedules
        ClassSchedule::firstOrCreate(['class_id' => $if1a->id, 'day' => 'Senin', 'start_time' => '08:00', 'end_time' => '09:40'], ['room' => 'R.301']);
        ClassSchedule::firstOrCreate(['class_id' => $if1a->id, 'day' => 'Rabu',  'start_time' => '13:00', 'end_time' => '14:40'], ['room' => 'Lab.2']);
        ClassSchedule::firstOrCreate(['class_id' => $if2a->id, 'day' => 'Selasa','start_time' => '10:00', 'end_time' => '11:40'], ['room' => 'R.205']);
        ClassSchedule::firstOrCreate(['class_id' => $if3a->id, 'day' => 'Kamis', 'start_time' => '08:00', 'end_time' => '09:40'], ['room' => 'Lab.3']);

        // 5. Students (termasuk 10 identitas dari ai-service/Mutiara/train)
        $students = [
            ['nim' => '2025001', 'name' => 'Ahmad Fauzi',      'email' => 'ahmad@student.example.com'],
            ['nim' => '2025002', 'name' => 'Budi Rahmawan',    'email' => 'budir@student.example.com'],
            ['nim' => '2025003', 'name' => 'Citra Dewi',       'email' => 'citra@student.example.com'],
            ['nim' => '2025004', 'name' => 'Dimas Pratama',    'email' => 'dimas@student.example.com'],
            ['nim' => '2025005', 'name' => 'Eka Putri',        'email' => 'eka@student.example.com'],
            ['nim' => '2025006', 'name' => 'Fajar Nugroho',    'email' => 'fajar@student.example.com'],
            ['nim' => '2025007', 'name' => 'Gita Lestari',     'email' => 'gita@student.example.com'],
            ['nim' => '2025008', 'name' => 'Hendra Wijaya',    'email' => 'hendra@student.example.com'],
            ['nim' => '2025009', 'name' => 'Indah Permata',    'email' => 'indah@student.example.com'],
            ['nim' => '2025010', 'name' => 'Joko Susilo',      'email' => 'joko@student.example.com'],
            ['nim' => '2025011', 'name' => 'Kartika Sari',     'email' => 'kartika@student.example.com'],
            ['nim' => '2025012', 'name' => 'Lukman Hakim',     'email' => 'lukman@student.example.com'],
            ['nim' => '2025013', 'name' => 'Maya Anggraini',   'email' => 'maya@student.example.com'],
            ['nim' => '2025014', 'name' => 'Nanda Kurniawan',  'email' => 'nanda@student.example.com'],
            ['nim' => '2025015', 'name' => 'Olivia Rahayu',    'email' => 'olivia@student.example.com'],
            ['nim' => '2025101', 'name' => 'Ardian',           'email' => 'ardian@student.example.com'],
            ['nim' => '2025102', 'name' => 'Arsy',             'email' => 'arsy@student.example.com'],
            ['nim' => '2025103', 'name' => 'Aulia',            'email' => 'aulia@student.example.com'],
            ['nim' => '2025104', 'name' => 'Deni',             'email' => 'deni@student.example.com'],
            ['nim' => '2025105', 'name' => 'Dika',             'email' => 'dika@student.example.com'],
            ['nim' => '2025106', 'name' => 'Giska',            'email' => 'giska@student.example.com'],
            ['nim' => '2025107', 'name' => 'Mutiara',          'email' => 'mutiara@student.example.com'],
            ['nim' => '2025108', 'name' => 'Nathasa',          'email' => 'nathasa@student.example.com'],
            ['nim' => '2025109', 'name' => 'Nikolas',          'email' => 'nikolas@student.example.com'],
            ['nim' => '2025110', 'name' => 'Putri',            'email' => 'putri@student.example.com'],
        ];

        foreach ($students as $s) {
            Student::firstOrCreate(
                ['nim' => $s['nim']],
                [
                    'name' => $s['name'],
                    'email' => $s['email'],
                    'program_study' => 'Informatika',
                    'is_active' => true,
                ]
            );
        }

        // 6. ML models
        MlModel::firstOrCreate(
            ['name' => 'yolov11-face', 'version' => 'v1.0'],
            [
                'type' => 'detector',
                'object_key' => 'models/yolov11-face-v1.0.pt',
                'metrics' => ['mAP' => 0.87, 'precision' => 0.91, 'recall' => 0.84],
                'is_active' => true,
            ]
        );

        MlModel::firstOrCreate(
            ['name' => 'arcface-buffalo_l', 'version' => 'v1.0'],
            [
                'type' => 'recognizer',
                'object_key' => 'models/arcface-buffalo-l-v1.0.pth',
                'metrics' => ['accuracy' => 0.98],
                'is_active' => true,
            ]
        );
    }
}