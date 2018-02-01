'use strict';

const { EventEmitter } = require('events');

const GitlabWebhook = function GitlabWebhook(options) {
    if (typeof options !== 'object') {
        throw new TypeError('must provide an options object');
    }

    if (typeof options.path !== 'string') {
        throw new TypeError(`must provide a 'path' option`);
    }

    options.secret = options.secret || '';

    function handler(req, res, next) {
        if (req.method !== 'POST' || req.url.split('?').shift() !== options.path) {
            return next();
        }

        function reportError(message) {
            res.status(400).send({
                error: message
            });

            handler.emit('error', new Error(message), req, res);
        }

        let token = req.headers['x-gitlab-token'];
        if (!token) {
            return reportError('No token found in the request');
        }

        let event = req.headers['x-gitlab-event'];
        if (!event) {
            return reportError('No event found in the request');
        }

        if (!req.body) {
            return reportError('Make sure body-parser is used');
        }

        if (options.secret && options.secret !== token) {
            return reportError('Failed to verify secret');
        }

        // parse payload
        let payloadData = req.body;
        const repo = payloadData.repository && payloadData.repository.name;

        // emit events
        handler.emit('*', payloadData.event_name, repo, payloadData);
        handler.emit(payloadData.event_name, repo, payloadData);

        if (repo) {
            handler.emit(repo, payloadData.event_name, payloadData);
        }

        res.status(200).send({
            success: true
        });
    }

    Object.assign(handler, EventEmitter.prototype);
    EventEmitter.call(handler);

    return handler
}

module.exports = GitlabWebhook