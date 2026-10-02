# Simulateur de guichet automatique

Application web simulant les opérations d'une institution bancaire : gestion des clients, comptes, transactions et opérations administratives.

Le projet met en œuvre une architecture **Node.js / Express / MySQL** avec séparation des contrôleurs, modèles, middlewares et vues.

## Fonctionnalités

### Client

* Authentification et gestion de session
* Consultation des comptes
* Création de comptes admissibles
* Consultation de l'historique des transactions
* Dépôts
* Retraits
* Transferts
* Paiements
* Utilisation automatique d'une marge de crédit lorsque le solde disponible est insuffisant

### Administration

* Ouverture et fermeture du guichet
* Consultation des soldes bancaires
* Gestion des clients
* Blocage et déblocage de comptes utilisateurs
* Gestion des comptes bancaires
* Consultation et filtrage des transactions
* Remplissage du guichet
* Versement des intérêts sur les comptes d'épargne
* Gestion des intérêts sur les marges de crédit
* Prélèvements hypothécaires

## Technologies

* **Node.js**
* **Express**
* **EJS**
* **MySQL**
* **mysql2**
* **bcryptjs**
* **express-session**
* **connect-flash**
* **dotenv**
* **Nodemon** pour le développement

## Architecture

Le projet suit une séparation des responsabilités inspirée du modèle MVC :

```text
.
├── config/
│   ├── database.js
│   └── initDatabase.js
│
├── controllers/
│   ├── accueil.js
│   ├── administration.js
│   ├── adminClients.js
│   ├── adminComptes.js
│   ├── adminTransactions.js
│   ├── clientComptes.js
│   ├── clientTransactions.js
│   ├── connexion.js
│   └── deconnexion.js
│
├── helpers/
│   └── tableHelper.js
│
├── middlewares/
│   ├── authentification.js
│   ├── flash.js
│   ├── guichetEtat.js
│   └── injecteurUtilisateur.js
│
├── models/
│   ├── AdministrationModel.js
│   ├── BanqueModel.js
│   ├── CompteModel.js
│   ├── GuichetModel.js
│   ├── TransactionModel.js
│   └── UsagerModel.js
│
├── public/
│   ├── css/
│   ├── img/
│   └── scripts/
│
├── views/
│   ├── admin/
│   ├── client/
│   └── layouts/
│
├── .env.example
├── .gitignore
├── GuichetAutomatique.sql
├── guichet.js
├── package.json
└── README.md
```

### Couche application

* **Controllers** : gestion des requêtes HTTP et coordination des opérations.
* **Models** : accès aux données et implémentation d'une partie de la logique métier.
* **Middlewares** : authentification, gestion de session et injection du contexte utilisateur.
* **Views** : interfaces EJS destinées aux clients et aux administrateurs.
* **Database** : schéma MySQL, contraintes, vues, procédures stockées, fonctions et triggers.

## Base de données

La base de données modélise notamment :

* les utilisateurs
* les types de comptes
* les comptes bancaires
* les types de transactions
* les transactions
* l'état du guichet

Le script `GuichetAutomatique.sql` initialise le schéma et contient également plusieurs éléments de logique côté base de données, notamment :

* vues SQL
* procédures stockées
* fonction de génération des numéros de compte
* trigger de création automatique d'un compte chèques
* contraintes d'intégrité référentielle

Au démarrage de l'application, `config/initDatabase.js` initialise également les données nécessaires au fonctionnement de l'application.

## Installation

### Prérequis

* Node.js
* MySQL 8.x

### 1. Cloner le dépôt

```bash
git clone <URL_DU_DEPOT>
cd <NOM_DU_DEPOT>
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Créer la base de données

Importer le fichier :

```text
GuichetAutomatique.sql
```

dans MySQL.

### 4. Configurer les variables d'environnement

Créer un fichier `.env` à partir de `.env.example` :

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=GuichetAutomatique
SESSION_SECRET=
ADMIN_PASSWORD=
```

Les valeurs réelles du fichier `.env` ne doivent pas être ajoutées au dépôt Git.

### 5. Démarrer l'application

Pour le développement :

```bash
npm run dev
```

Pour démarrer l'application normalement :

```bash
npm start
```

L'application est ensuite accessible à :

```text
http://localhost:3000
```

## Compte administrateur

Lors de l'initialisation, l'application crée automatiquement un utilisateur administrateur à partir de la variable d'environnement `ADMIN_PASSWORD`.

Le mot de passe n'est donc pas stocké directement dans le code source.

## Sécurité

Le projet utilise notamment :

* hachage des mots de passe avec `bcryptjs`
* variables d'environnement pour les informations sensibles
* requêtes SQL paramétrées pour les opérations utilisant des données utilisateur
* contrôle d'accès par rôle
* sessions utilisateur
* contraintes d'intégrité référentielle dans MySQL

> Cette application est un projet de démonstration et ne doit pas être utilisée telle quelle pour traiter de véritables données bancaires ou financières.

## État du projet

Projet fonctionnel servant également de démonstration de développement d'une application web complète avec gestion des utilisateurs, logique métier, persistance des données et interface d'administration.