require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const expressSession = require('express-session');
const connectFlash = require('connect-flash');

const initDatabase = require('./config/initDatabase.js'); 
const flash = require('./middlewares/flash.js');
const authentificationMiddleware = require('./middlewares/authentification.js');
const injecteurUtilisateurMiddleware = require('./middlewares/injecteurUtilisateur.js');
const guichetEtatMiddleware = require('./middlewares/guichetEtat.js');
const accueilController = require('./controllers/accueil.js');
const connexionController = require('./controllers/connexion.js');
const deconnexionController = require('./controllers/deconnexion.js');
const administrationController = require('./controllers/administration.js');
const adminClientsController = require('./controllers/adminClients.js');
const adminComptesController = require('./controllers/adminComptes.js');
const adminTransactionsController = require('./controllers/adminTransactions.js');
const clientComptesController = require('./controllers/clientComptes.js');
const clientTransactionsController = require('./controllers/clientTransactions.js');
const tableHelper = require('./helpers/tableHelper.js');

const app = new express();
app.use(expressSession({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: false,
    cookie: { 
        secure: false,
    }
}));

app.use(connectFlash());
app.use(flash);

app.use(injecteurUtilisateurMiddleware);
app.use(guichetEtatMiddleware.injecterEtatGuichet);

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');

app.locals.tableHelper = tableHelper;

app.get('/', accueilController.get);
app.get('/connexion', connexionController.get);
app.post('/connexion', connexionController.post);
app.get('/deconnexion', deconnexionController.get);
app.get('/admin/administration', authentificationMiddleware.requiertAdmin, administrationController.administrationGet);
app.post('/admin/administration', authentificationMiddleware.requiertAdmin, administrationController.administrationPost);
app.get('/admin/clients', authentificationMiddleware.requiertAdmin, adminClientsController.clientsGet);
app.post('/admin/clients', authentificationMiddleware.requiertAdmin, adminClientsController.clientsPost);
app.post('/admin/clients/:id/toggle-bloque', authentificationMiddleware.requiertAdmin, adminClientsController.toggleBloque);
app.get('/admin/comptes', authentificationMiddleware.requiertAdmin, adminComptesController.comptesGet);
app.post('/admin/comptes', authentificationMiddleware.requiertAdmin, adminComptesController.comptesPost);
app.get('/admin/transactions', authentificationMiddleware.requiertAdmin, adminTransactionsController.transactionsGet);
app.post('/admin/transactions', authentificationMiddleware.requiertAdmin, adminTransactionsController.transactionsPost);
app.get('/client/comptes', authentificationMiddleware.requiertClient, clientComptesController.comptesGet);
app.post('/client/comptes', authentificationMiddleware.requiertClient, clientComptesController.comptesPost);
app.get('/client/transactions', authentificationMiddleware.requiertClient, clientTransactionsController.transactionsGet);
app.post('/client/transactions', authentificationMiddleware.requiertClient, clientTransactionsController.transactionsPost);

async function demarrer() {
    try {
        await initDatabase.load();
        app.listen(3000, () => {
            console.log("L'application Guichet automatique écoute sur http://127.0.0.1:3000");
        });
    } catch (error) {
        console.log('Erreur de demarrage:', error.message);
    }
}
demarrer();

app.use((req, res) => res.render('error404'));