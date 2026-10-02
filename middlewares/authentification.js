module.exports = {
    
    requiertAdmin: (req, res, next) => {
        req.session?.utilisateur?.administrateur ? next() : res.redirect('/')
    },

    requiertClient: (req, res, next) => {
        const usager = req.session?.utilisateur;
        return usager && !usager.administrateur ? next() : res.redirect('/');
    }
};