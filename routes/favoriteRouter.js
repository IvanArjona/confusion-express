const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const authenticate = require('../authenticate');
const cors = require('./cors');
const Favorites = require('../models/favorite');

const favoriteRouter = express.Router();

favoriteRouter.use(bodyParser.json());

favoriteRouter.route('/')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200) })
    .get(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
        Favorites.findOne({ user: req.user._id })
            .populate('user')
            .populate('dishes')
            .then((favorites) => res.json(favorites), (err) => next(err))
            .catch((err) => next(err));
    })
    .post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
        Favorites.findOne({ user: req.user._id })
            .then((favorite) => {
                // Favorite exists
                if (favorite) {
                    for (let dish of req.body) {
                        if (favorite.dishes.indexOf(dish._id) === -1) {
                            favorite.dishes.push(dish._id);
                        }
                    }
                    return favorite.save();
                // New favorite
                } else {
                    return Favorites.create({
                        'user': req.user._id,
                        'dishes': req.body
                    });
                }
            }).then((favorite) => res.json(favorite), (err) => next(err))
            .catch((err) => next(err));
    })
    .delete(cors.corsWithOptions, authenticate.verifyAdmin, (req, res, next) => {
        Favorites.findOneAndRemove({ user: req.user._id })
            .then((resp) => res.json(resp), (err) => next(err))
            .catch((err) => next(err));
    });

favoriteRouter.route('/:dishId')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200) })
    .post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
        Favorites.findOne({ user: req.user._id })
            .then((favorite) => {
                const dishId = req.params.dishId;
                // Favorite exists
                if (favorite) {
                    if (favorite.dishes.indexOf(dishId) === -1) {
                        favorite.dishes.push(dishId);
                    }
                    return favorite.save();
                    // New favorite
                } else {
                    return Favorites.create({
                        'user': req.user._id,
                        'dishes': [{ _id: dishId }]
                    });
                }
            }).then((favorite) => res.json(favorite), (err) => next(err))
            .catch((err) => next(err));
    })
    .delete(cors.corsWithOptions, authenticate.verifyAdmin, (req, res, next) => {
        Favorites.findOne({ user: req.user._id })
            .populate('dishes')
            .then((favorite) => {
                if (favorite) {
                    if (req.user._id.equals(favorite.user) || req.user.admin) {
                        for (let dish of favorite.dishes) {
                            if (dish && dish._id.equals(req.params.dishId)) {
                                dish.remove();
                                break;
                            }
                        }
                        return favorite.save();
                    } else {
                        const err = new Error('You can\'t delete this favorite');
                        err.status = 403;
                        return next(err);
                    }
                } else {
                    err = new Error('Favorites not found');
                    err.status = 404;
                    return next(err);
                }
            })
            .then((resp) => res.json(resp), (err) => next(err))
            .catch((err) => next(err));
    });


module.exports = favoriteRouter;
