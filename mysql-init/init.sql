CREATE DATABASE IF NOT EXISTS demo;
use demo;

CREATE TABLE IF NOT EXISTS `user` (   
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,   
    `name` VARCHAR(255),   
    `level` INT NOT NULL,
    `country` VARCHAR(2)
);

-- Creating mock user
INSERT INTO user (name, level, country)
VALUES
('Aino', 6, 'FI'),
('Elias', 7, 'FI'),
('Venla', 8, 'FI'),
('Matias', 9, 'FI'),
('Sofia', 10, 'FI'),
('Olavi', 11, 'FI'),
('Kerttu', 12, 'FI'),
('Mikael', 13, 'FI'),
('Liisa', 14, 'FI'),
('Juhani', 15, 'FI'),
('Ilona', 23, 'FI'),
('Antti', 45, 'FI'),
('Marja', 68, 'FI'),
('Oskari', 100, 'FI'),
('Pekka', 150, 'FI'),
('Helmi', 1000, 'FI'),

('Astrid', 1, 'SE'),
('Ingrid', 3, 'SE'),
('Erik', 4, 'SE'),
('Karin', 5, 'SE'),
('Lars', 6, 'SE'),
('Elin', 7, 'SE'),
('Johan', 8, 'SE'),
('Sven', 9, 'SE'),
('Anna', 10, 'SE');

-- active server data
-- + advertised address
CREATE TABLE IF NOT EXISTS `server` (
    `instance_name` VARCHAR(256) PRIMARY KEY NOT NULL,
    `country` VARCHAR(2) NOT NULL,
    `advertised_address` VARCHAR(256) NOT NULL,
    `status` ENUM('active', 'inactive') NOT NULL,
    UNIQUE(advertised_address)
);

CREATE TABLE IF NOT EXISTS `game` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(255),
    `max_player` INT NOT NULL,
    `match_formula` VARCHAR(255) NOT NULL,
    `logic` VARCHAR(255) NOT NULL
);
-- Guess number limit players to be in a same country
-- Gold digging game does not limit the player to be the same country
-- But the score calculation could take the country field into account to match the player together
-- So some advance formular could be develoed, 
-- such as '(level // 10), age' and distance for 2 dimentional vector can be calculated
-- for example, "match": "REGION(country)" where REGION(FI) = EUROPE
INSERT INTO game (name, max_player, match_formula, logic) 
VALUES 
(
    'Guess number',
    10,
    '{"match":"`${country}-pool`","score":"level / 10"}',
    'RAND'
),
(
    'Gold digging',
    15,
    '{"score":"level / 10"}',
    'MAX'
);

-- CREATE ACTIVE PLAYER:


CREATE TABLE IF NOT EXISTS `match` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `startTime` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `number_players` INT NOT NULL,
    `endTime` TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `match_history` (
    `match_id` INT NOT NULL,
    `player_id` INT NOT NULL,
    `input`  VARCHAR(255),
    PRIMARY KEY (user_id, game_id)
);



