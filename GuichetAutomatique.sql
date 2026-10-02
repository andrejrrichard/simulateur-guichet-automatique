DROP DATABASE IF EXISTS GuichetAutomatique;
CREATE DATABASE GuichetAutomatique;
USE GuichetAutomatique;

CREATE TABLE guichet_etat (
    etat BOOLEAN
);
INSERT INTO guichet_etat (etat) VALUES (TRUE);

CREATE TABLE usager (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(6) COLLATE utf8mb4_bin UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    prenom VARCHAR(50) NULL,
    nom VARCHAR(50) NULL, 
    telephone VARCHAR(15) NULL,    
    courriel VARCHAR(100) NULL,
    tentatives TINYINT DEFAULT 0,
    bloque BOOLEAN DEFAULT FALSE,
    administrateur BOOLEAN DEFAULT FALSE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE VIEW vue_usagers AS
SELECT     
    usager.id,
    usager.bloque,
    CASE 
        WHEN usager.prenom IS NULL OR usager.nom IS NULL THEN
            usager.code
        ELSE
            CONCAT(usager.code, ' - ', usager.prenom, ' ', usager.nom)
    END as usager,    
    usager.courriel,
    usager.telephone,
    usager.administrateur
FROM usager
ORDER BY usager.id DESC;

DELIMITER $$
CREATE PROCEDURE toggle_client_bloque(IN p_usager_id INT)
BEGIN
    DECLARE current_bloque BOOLEAN;
    
    SELECT bloque INTO current_bloque
    FROM usager 
    WHERE id = p_usager_id;

    UPDATE usager 
    SET bloque = NOT current_bloque
    WHERE id = p_usager_id;
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE creer_nouveau_client(
    IN p_code VARCHAR(255),
    IN p_password_hash VARCHAR(255),
    IN p_courriel VARCHAR(255),
    IN p_prenom VARCHAR(255),
    IN p_nom VARCHAR(255),
    IN p_telephone VARCHAR(255)
)
BEGIN    
    IF p_code IS NULL OR p_code = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Le code est obligatoire';
    END IF;

    IF EXISTS (SELECT 1 FROM usager WHERE code = p_code) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Le code existe déjà';
    END IF;

    IF LENGTH(p_code) > 6 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Le code ne peut pas dépasser 6 caractères';
    END IF;

    IF p_password_hash IS NULL OR p_password_hash = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Le mot de passe est obligatoire';
    END IF;

    IF LENGTH(p_courriel) > 100 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Le courriel ne peut pas dépasser 100 caractères';
    END IF;

    IF LENGTH(p_prenom) > 50 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Le prénom ne peut pas dépasser 50 caractères';
    END IF;    

    IF LENGTH(p_nom) > 50 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Le nom ne peut pas dépasser 50 caractères';
    END IF;  
 
    IF LENGTH(p_telephone) > 15 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Le téléphone ne peut pas dépasser 15 caractères';
    END IF;  

    INSERT INTO usager (code, password_hash, prenom, nom, telephone, courriel) VALUES 
    (p_code, p_password_hash, p_prenom, p_nom, p_telephone, p_courriel);
END$$
DELIMITER ;

CREATE TABLE compte_type (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(20) UNIQUE NOT NULL,
    prefixe VARCHAR(4) UNIQUE NOT NULL,
    client BOOLEAN DEFAULT TRUE
);

INSERT INTO compte_type (code, prefixe) VALUES
('CHEQUE', 'CHQ'),
('EPARGNE', 'EPG'), 
('FACTURE', 'FAC'),
('HYPOTHECAIRE', 'HYP'),
('MARGE_CREDIT', 'MCR');

INSERT INTO compte_type (code, prefixe, client) VALUES
('GUICHET', 'GUI', FALSE), 
('DEPOT', 'DEP', FALSE),
('BANQUE', 'BNQ', FALSE);

CREATE TABLE compte (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usager_id  INT NOT NULL,
    compte_type_id INT NOT NULL,
    numero VARCHAR(17) NOT NULL,
    solde DECIMAL(10,2) DEFAULT 0.00,
    FOREIGN KEY (usager_id) REFERENCES usager(id),
    FOREIGN KEY (compte_type_id) REFERENCES compte_type(id)
);

CREATE VIEW vue_comptes AS
SELECT 
    compte.id,
    compte.usager_id,
    CASE 
        WHEN usager.prenom IS NULL OR usager.nom IS NULL THEN
            usager.code
        ELSE
            CONCAT(usager.code, ' - ', usager.prenom, ' ', usager.nom)
    END as usager,
    compte_type.code as compte_type,
    compte.numero,
    CASE 
        WHEN compte_type.code IN ('GUICHET', 'DEPOT', 'BANQUE') THEN 0
        ELSE compte.solde
    END as solde,
    usager.administrateur
FROM compte
INNER JOIN compte_type ON compte.compte_type_id = compte_type.id
INNER JOIN usager ON compte.usager_id = usager.id
ORDER BY usager.id desc, compte.numero;

CREATE TABLE compte_sequence (
    compte_type_id INT PRIMARY KEY,
    prochain_numero INT NOT NULL DEFAULT 1,
    longueur_numero INT NOT NULL DEFAULT 8,
    FOREIGN KEY (compte_type_id) REFERENCES compte_type(id)
);

INSERT INTO compte_sequence (compte_type_id, prochain_numero, longueur_numero)
SELECT id, 1, 8 FROM compte_type;

DELIMITER $$
CREATE FUNCTION generer_numero_compte(
    p_compte_type_id INT
) 
RETURNS VARCHAR(17)
DETERMINISTIC
BEGIN
    DECLARE v_prefixe VARCHAR(4);
    DECLARE v_prochain_num INT;
    DECLARE v_numero_complet VARCHAR(17);
    DECLARE v_longueur INT;
    
    SELECT prefixe INTO v_prefixe 
    FROM compte_type 
    WHERE id = p_compte_type_id;
    
    SELECT prochain_numero, longueur_numero 
    INTO v_prochain_num, v_longueur
    FROM compte_sequence 
    WHERE compte_type_id = p_compte_type_id
    FOR UPDATE;
    
    -- Formater le numéro: PREFIXE-00000001
    SET v_numero_complet = CONCAT(
        v_prefixe,
        '-',
        LPAD(v_prochain_num, v_longueur, '0')
    );
    
    UPDATE compte_sequence 
    SET prochain_numero = prochain_numero + 1
    WHERE compte_type_id = p_compte_type_id;
    
    RETURN v_numero_complet;
END$$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE creer_compte_client(
    IN p_usager_id  INT,
    IN p_compte_type_id INT  
)
BEGIN
    DECLARE v_compte_type_code VARCHAR(20);
    DECLARE v_numero_compte VARCHAR(17);
    
    SELECT code INTO v_compte_type_code
    FROM compte_type 
    WHERE id = p_compte_type_id;  
    
    IF v_compte_type_code IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Type de compte invalide';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM usager WHERE id = p_usager_id) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Client inexistant';
    END IF;

    IF v_compte_type_code = 'MARGE_CREDIT' THEN  
        IF EXISTS (
            SELECT 1 
            FROM compte
            JOIN compte_type ON compte.compte_type_id = compte_type.id
            WHERE compte.usager_id = p_usager_id 
            AND compte_type.code = 'MARGE_CREDIT'
        ) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Une seule marge de crédit par client';
        END IF;
    END IF; 

    SET v_numero_compte = generer_numero_compte(p_compte_type_id); 

    INSERT INTO compte (usager_id, compte_type_id, numero)
    VALUES (p_usager_id, p_compte_type_id, v_numero_compte);  
END$$
DELIMITER ;

DELIMITER $$
CREATE TRIGGER creer_compte_cheque_automatique
AFTER INSERT ON usager
FOR EACH ROW
BEGIN
    DECLARE v_compte_type_id INT;

    IF NEW.administrateur = FALSE THEN
        SELECT id INTO v_compte_type_id
        FROM compte_type 
        WHERE code = 'CHEQUE';    
        CALL creer_compte_client(NEW.id, v_compte_type_id);
    END IF;
END$$
DELIMITER ;

CREATE VIEW vue_compte_banque AS
SELECT 
    compte.id,
    compte.solde,
    compte.usager_id
FROM compte
INNER JOIN compte_type ON compte.compte_type_id = compte_type.id
WHERE compte_type.code = 'BANQUE';

CREATE VIEW vue_compte_guichet AS
SELECT 
    compte.id,
    compte.solde,
    compte.usager_id
FROM compte
INNER JOIN compte_type ON compte.compte_type_id = compte_type.id
WHERE compte_type.code = 'GUICHET';

CREATE VIEW vue_compte_depot AS
SELECT 
    compte.id,
    compte.solde,
    compte.usager_id
FROM compte
INNER JOIN compte_type ON compte.compte_type_id = compte_type.id
WHERE compte_type.code = 'DEPOT';

CREATE TABLE transaction_type (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(20) UNIQUE NOT NULL,
    client BOOLEAN DEFAULT TRUE
);
INSERT INTO transaction_type (code) VALUES
('DEPOT'), 
('RETRAIT'),
('TRANSFERT'),
('PAIEMENT');
INSERT INTO transaction_type (code, client) VALUES
('INTERET', FALSE),
('PRELEVEMENT', FALSE);

CREATE TABLE transaction (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usager_id INT NOT NULL,
    transaction_type_id INT NOT NULL,
    compte_source_id INT NOT NULL,
    compte_destination_id INT NOT NULL,
    montant DECIMAL(10,2) NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usager_id) REFERENCES usager(id),
    FOREIGN KEY (compte_source_id) REFERENCES compte(id),
    FOREIGN KEY (compte_destination_id) REFERENCES compte(id),
    FOREIGN KEY (transaction_type_id) REFERENCES transaction_type(id)
);

DELIMITER $$
CREATE PROCEDURE transactions_liste(
    IN p_usager_id INT,
    IN p_transaction_type_id INT,
    IN p_compte_type_id INT
)
BEGIN
    SELECT 
        transaction.date,
        transaction_type.code as transaction_type,
        CASE 
            WHEN (SELECT code FROM compte_type WHERE id = compte_source.compte_type_id) IN ('GUICHET', 'DEPOT', 'BANQUE') THEN
                compte_source.numero
            ELSE
                CONCAT(
                    CASE 
                        WHEN usager_source.prenom IS NULL OR usager_source.nom IS NULL THEN
                            usager_source.code
                        ELSE
                            CONCAT(usager_source.code, ' - ', usager_source.prenom, ' ', usager_source.nom)
                    END,
                    ' - ', compte_source.numero
                )
        END as compte_source,
        CASE 
            WHEN (SELECT code FROM compte_type WHERE id = compte_destination.compte_type_id) IN ('GUICHET', 'DEPOT', 'BANQUE') THEN
                compte_destination.numero
            ELSE
                CONCAT(
                    CASE 
                        WHEN usager_destination.prenom IS NULL OR usager_destination.nom IS NULL THEN
                            usager_destination.code
                        ELSE
                            CONCAT(usager_destination.code, ' - ', usager_destination.prenom, ' ', usager_destination.nom)
                    END,
                    ' - ', compte_destination.numero
                )
        END as compte_destination,
        transaction.montant
    FROM transaction
    INNER JOIN usager ON transaction.usager_id = usager.id
    INNER JOIN compte as compte_source ON transaction.compte_source_id = compte_source.id
    INNER JOIN usager as usager_source ON compte_source.usager_id = usager_source.id
    INNER JOIN compte as compte_destination ON transaction.compte_destination_id = compte_destination.id
    INNER JOIN usager as usager_destination ON compte_destination.usager_id = usager_destination.id
    INNER JOIN transaction_type ON transaction.transaction_type_id = transaction_type.id
    WHERE (
        p_usager_id IS NULL 
        OR transaction.usager_id = p_usager_id 
        OR compte_source.usager_id = p_usager_id 
        OR compte_destination.usager_id = p_usager_id
    )
    AND (p_transaction_type_id IS NULL OR transaction.transaction_type_id = p_transaction_type_id)
    AND (
        p_compte_type_id IS NULL 
        OR compte_source.compte_type_id = p_compte_type_id 
        OR compte_destination.compte_type_id = p_compte_type_id
    )
    ORDER BY transaction.id DESC;
END $$
DELIMITER ;


DELIMITER $$
CREATE PROCEDURE get_compte_source_by_transaction_type(
    IN p_usager_id INT,
    IN p_transaction_type_id INT
)
BEGIN
    DECLARE v_transaction_type_code VARCHAR(20);

    SELECT code INTO v_transaction_type_code
    FROM transaction_type
    WHERE id = p_transaction_type_id;
    
    IF v_transaction_type_code = 'DEPOT' THEN
        SELECT *
        FROM vue_comptes
        WHERE compte_type = 'DEPOT';
    
    ELSEIF v_transaction_type_code = 'RETRAIT' THEN
        SELECT *
        FROM vue_comptes
        WHERE usager_id = p_usager_id
        AND compte_type IN ('CHEQUE', 'EPARGNE');
    
    ELSEIF v_transaction_type_code = 'TRANSFERT' THEN
        SELECT *
        FROM vue_comptes
        WHERE usager_id = p_usager_id
        AND compte_type = 'CHEQUE';
    
    ELSEIF v_transaction_type_code = 'PAIEMENT' THEN
        SELECT *
        FROM vue_comptes
        WHERE usager_id = p_usager_id
        AND compte_type = 'CHEQUE';

    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Transaction non autorisée';
    END IF;    
END$$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE get_compte_destinations_by_transaction_type_and_compte_source(
    IN p_usager_id INT,
    IN p_transaction_type_id INT,
    IN p_compte_source_id INT
)
BEGIN
    DECLARE v_transaction_type_code VARCHAR(20);
    DECLARE v_compte_source_type_code VARCHAR(20);
    
    SELECT code INTO v_transaction_type_code
    FROM transaction_type
    WHERE id = p_transaction_type_id;

    SELECT compte_type INTO v_compte_source_type_code
    FROM vue_comptes
    WHERE id = p_compte_source_id;
    
    IF v_transaction_type_code = 'DEPOT' THEN
        IF v_compte_source_type_code = 'DEPOT' THEN
            SELECT *
            FROM vue_comptes
            WHERE usager_id = p_usager_id
            AND compte_type IN ('CHEQUE', 'EPARGNE', 'HYPOTHECAIRE');
        ELSE
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Pour un dépôt, le compte source doit être DEPOT';
        END IF;
    
    ELSEIF v_transaction_type_code = 'RETRAIT' THEN
        IF v_compte_source_type_code = 'CHEQUE' OR v_compte_source_type_code = 'EPARGNE' THEN
            SELECT *
            FROM vue_comptes
            WHERE compte_type = 'GUICHET';
        ELSE
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Pour un retrait, le compte source doit être CHEQUE ou EPARGNE';
        END IF;
    
    ELSEIF v_transaction_type_code = 'TRANSFERT' THEN
        IF v_compte_source_type_code = 'CHEQUE' THEN
            SELECT *
            FROM vue_comptes
            WHERE (
                (usager_id = p_usager_id AND compte_type = 'CHEQUE' AND id != p_compte_source_id)        
                OR (usager_id = p_usager_id AND compte_type IN ('EPARGNE', 'HYPOTHECAIRE', 'MARGE_CREDIT'))
            );
        ELSE
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Pour un transfert, le compte source doit être CHEQUE';
        END IF;
    
    ELSEIF v_transaction_type_code = 'PAIEMENT' THEN
        IF v_compte_source_type_code = 'CHEQUE' THEN
            SELECT *
            FROM vue_comptes
            WHERE usager_id = p_usager_id
            AND compte_type = 'FACTURE';
        ELSE
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Pour un paiement, le compte source doit être CHEQUE';
        END IF;
    
    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Type de transaction non supporté';
    END IF;
END$$
DELIMITER ;

CREATE TABLE regle_transfert_autorise (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type_source_id INT NOT NULL,
    type_destination_id INT NOT NULL,
    UNIQUE KEY (type_source_id, type_destination_id),
    FOREIGN KEY (type_source_id) REFERENCES compte_type(id),
    FOREIGN KEY (type_destination_id) REFERENCES compte_type(id)
);

INSERT INTO regle_transfert_autorise (type_source_id, type_destination_id) VALUES
((SELECT id FROM compte_type WHERE code = 'DEPOT'), (SELECT id FROM compte_type WHERE code = 'CHEQUE')),
((SELECT id FROM compte_type WHERE code = 'DEPOT'), (SELECT id FROM compte_type WHERE code = 'EPARGNE')),
((SELECT id FROM compte_type WHERE code = 'DEPOT'), (SELECT id FROM compte_type WHERE code = 'HYPOTHECAIRE')),
((SELECT id FROM compte_type WHERE code = 'CHEQUE'), (SELECT id FROM compte_type WHERE code = 'GUICHET')),
((SELECT id FROM compte_type WHERE code = 'EPARGNE'), (SELECT id FROM compte_type WHERE code = 'GUICHET')),
((SELECT id FROM compte_type WHERE code = 'CHEQUE'), (SELECT id FROM compte_type WHERE code = 'CHEQUE')),
((SELECT id FROM compte_type WHERE code = 'CHEQUE'), (SELECT id FROM compte_type WHERE code = 'EPARGNE')),
((SELECT id FROM compte_type WHERE code = 'CHEQUE'), (SELECT id FROM compte_type WHERE code = 'HYPOTHECAIRE')),
((SELECT id FROM compte_type WHERE code = 'CHEQUE'), (SELECT id FROM compte_type WHERE code = 'MARGE_CREDIT')),
((SELECT id FROM compte_type WHERE code = 'CHEQUE'), (SELECT id FROM compte_type WHERE code = 'FACTURE')),
((SELECT id FROM compte_type WHERE code = 'MARGE_CREDIT'), (SELECT id FROM compte_type WHERE code = 'HYPOTHECAIRE')),
((SELECT id FROM compte_type WHERE code = 'MARGE_CREDIT'), (SELECT id FROM compte_type WHERE code = 'CHEQUE')),
((SELECT id FROM compte_type WHERE code = 'MARGE_CREDIT'), (SELECT id FROM compte_type WHERE code = 'EPARGNE')),
((SELECT id FROM compte_type WHERE code = 'BANQUE'), (SELECT id FROM compte_type WHERE code = 'EPARGNE')),
((SELECT id FROM compte_type WHERE code = 'MARGE_CREDIT'), (SELECT id FROM compte_type WHERE code = 'BANQUE')),
((SELECT id FROM compte_type WHERE code = 'HYPOTHECAIRE'), (SELECT id FROM compte_type WHERE code = 'BANQUE')),
((SELECT id FROM compte_type WHERE code = 'CHEQUE'), (SELECT id FROM compte_type WHERE code = 'BANQUE'));

DELIMITER $$
CREATE PROCEDURE effectuer_transfert(
    IN p_usager_id INT,
    IN p_transaction_type_id INT,
    IN p_source_compte_id INT,
    IN p_destination_compte_id INT,
    IN p_montant DECIMAL(10,2)
)
BEGIN
    DECLARE v_source_compte_type_id INT;
    DECLARE v_source_solde DECIMAL(10,2);
    DECLARE v_source_code VARCHAR(20);
    DECLARE v_destination_compte_type_id INT;
    DECLARE v_destination_solde DECIMAL(10,2);
    DECLARE v_destination_code VARCHAR(20);

    SELECT c.compte_type_id, c.solde, ct.code 
    INTO v_source_compte_type_id, v_source_solde, v_source_code
    FROM compte c
    INNER JOIN compte_type ct ON c.compte_type_id = ct.id
    WHERE c.id = p_source_compte_id;
 
    SELECT c.compte_type_id, c.solde, ct.code 
    INTO v_destination_compte_type_id, v_destination_solde, v_destination_code
    FROM compte c
    INNER JOIN compte_type ct ON c.compte_type_id = ct.id
    WHERE c.id = p_destination_compte_id;

    IF v_source_compte_type_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Compte source invalide';
    END IF;
    
    IF v_destination_compte_type_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Compte destination invalide';
    END IF;

    IF p_source_compte_id = p_destination_compte_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Le compte source et le compte destination ne peuvent pas être le même';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM regle_transfert_autorise
        WHERE type_source_id = v_source_compte_type_id
        AND type_destination_id = v_destination_compte_type_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Transfert non autorisé entre ces types de comptes';
    END IF;
        
    IF v_source_code IN ('MARGE_CREDIT', 'DEPOT', 'GUICHET') THEN
        UPDATE compte 
        SET solde = solde + p_montant 
        WHERE id = p_source_compte_id;
    ELSE
        UPDATE compte 
        SET solde = solde - p_montant 
        WHERE id = p_source_compte_id;
    END IF;

    IF v_destination_code IN ('MARGE_CREDIT', 'DEPOT', 'GUICHET') THEN
        UPDATE compte 
        SET solde = solde - p_montant 
        WHERE id = p_destination_compte_id;
    ELSE
        UPDATE compte 
        SET solde = solde + p_montant 
        WHERE id = p_destination_compte_id;
    END IF;

    INSERT INTO transaction (usager_id, transaction_type_id ,compte_source_id, compte_destination_id, montant)
    VALUES (p_usager_id, p_transaction_type_id, p_source_compte_id, p_destination_compte_id, p_montant);
END$$
DELIMITER ;


DELIMITER $$
CREATE PROCEDURE remplir_guichet(
    IN p_montant DECIMAL(10,2)
)
BEGIN
    DECLARE v_usager_banque_id INT;
    DECLARE v_compte_banque_id INT;
    DECLARE v_banque_solde DECIMAL(10,2);
    DECLARE v_compte_guichet_id INT;    
    DECLARE v_guichet_solde DECIMAL(10,2);  
    DECLARE v_guichet_depot DECIMAL(10,2);  
    DECLARE v_nouveau_solde DECIMAL(10,2);
    
    IF p_montant IS NULL OR p_montant <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Le montant doit être un nombre positif, supérieur à zéro';
    END IF;
    
    IF p_montant > 99999999.99 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Le montant dépasse la limite autorisée';
    END IF;

    SELECT id, solde INTO v_compte_guichet_id, v_guichet_solde
    FROM vue_compte_guichet;
    
    SELECT id, solde, usager_id INTO v_compte_banque_id, v_banque_solde, v_usager_banque_id
    FROM vue_compte_banque;
    
    SET v_nouveau_solde = v_guichet_solde + p_montant;
    
    IF v_nouveau_solde > 20000.00 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Le guichet ne peut pas contenir plus de 20 000 $';
    END IF;
    
    IF v_banque_solde < p_montant THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Solde insuffisant à la banque';
    END IF;
    
    UPDATE compte 
    SET solde = solde - p_montant 
    WHERE id = v_compte_banque_id;
    
    UPDATE compte 
    SET solde = solde + p_montant 
    WHERE id = v_compte_guichet_id;
    
    INSERT INTO transaction (usager_id, transaction_type_id, compte_source_id, compte_destination_id, montant)
    VALUES (
        v_usager_banque_id,
        (SELECT id FROM transaction_type WHERE code = 'TRANSFERT'),
        v_compte_banque_id,
        v_compte_guichet_id,
        p_montant
    );
END$$
DELIMITER ;