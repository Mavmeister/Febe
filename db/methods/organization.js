var _ = require('lodash');
var Promise = require('bluebird');
var db = require('../db');

var common = require('./common');

var Organization = require('../models/organization');
var User = require('../models/user');
var Tag = require('../models/tag');

/**
 * Create and save a new Organization
 * @param  {Object}        fields    Fields to create Organization with
 * @param  {Integer|User}  owner     User object or id of the Organization owner
 * @return {Promise.<Organization>}  The newly created Organization
 */
var create = function(fields, owner) {
  if (owner === undefined) return Promise.reject('Owner not given.');

  return Organization.save(fields).then(function(organization) {
    return db.relate(owner, 'owns', organization).then(function() {
      return organization;
    });
  });
};

/**
 * Update an Organization
 * @param  {Integer} [id]     Id of the Organization to update, can be omitted if there is an id key in fields
 * @param  {Object} fields    Fields to update
 * @return {Promise.<Organization>}
 */
var update = function(id, fields) {
  if (typeof id === 'object') {
    fields = id;
    id = fields.id;
  }

  return Organization.read(id).then(function(organization) {
    return Organization.save(_.extend(organization, fields, {'id': id}));
  });
};

/**
 * Removes fields that shouldn't be public
 * @param {Organization}
 * @return {Organization} Organization with private fields removed
 */
var clean = common.clean_generator(Organization);

/**
 * Adds a Tag as a cause of Organization
 * @param {Integer|Organization}  organization  Organization object or id to add Tag to
 * @param {Integer|Tag}           cause         Tag or id to add to Organization
 */
var add_cause = common.add_rel_generator('Organization', 'cause', 'Tag', true);

/**
 * Adds an array of Tags as causes of Organization
 * @param {Integer|Organization}  organization  Organization or id to add Tags to
 * @param {Integer[]|Tag[]}       causes        Array of Tag or ids to add to Organization
 */
var add_causes = common.add_rels_generator(add_cause);

/**
 * Fetches one Organization including specifed extras
 * @param  {Integer}        organization_id  Id of the Organization
 * @param  {Object|Boolean} [options=true]   Either an object with with the extras to include or true to include all extras
 * @return {Promise.<Organization>}          Organization with all specified models included
 */
var with_extras = function(organization_id, options) {
  var include = {};
  if (options === undefined) options = true;

  if (options === true || options.owner) include.owner = {'model': User, 'rel': 'owns', 'direction': 'in', 'many': false};
  if (options === true || options.causes) include.causes = {'model': Tag, 'rel': 'skill', 'direction': 'out', 'many': true};


  return Organization.query('MATCH (node:Organization) WHERE id(node)={id}', {'id': organization_id}, {'include': include}).then(function(organization) {
    organization = organization[0];

    if (organization.owner) organization.owner = User.clean(organization.owner);

    return organization;
  });
};

/**
 * Find all Organizations with relationships to all specified Tag ids
 * @param  {Integer[]}  skill_ids   Array of Tag ids
 * @return {Promise.<Organization[]>}    Array of Organizations matching filter
 */
var find_by_cause = function(cause_ids) {
  var query = [
    'MATCH (tags:Tag {kind:"cause"}) WHERE id(tags) IN {tags}',
    'WITH COLLECT(tags) AS t',
    'MATCH (node:Organization)-->(tags) WHERE ALL(tag IN t WHERE (node)-->(tag))'
  ].join(' ');

  return Organization.query(query, {'tags': cause_ids});
};

module.exports = {
  'create': create,
  'update': update,
  'clean': clean,
  'add_cause': add_cause,
  'add_causes': add_causes,
  'with_extras': with_extras,
  'find_by_cause': find_by_cause
};
