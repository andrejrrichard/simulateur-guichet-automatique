module.exports = {
    
    get: (req, res) => {        
        req.session.destroy((err) => {
            if (err) {
                req.flash('messages', 'Erreur système');
                return res.redirect('/');
            }
            res.redirect('/connexion');
        });
    }
};