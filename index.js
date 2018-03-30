/**
 * @module RestList
 * 
 * @description Mongoose Express Rest API List
 * 
 * @author Alexandre Penombre <aluzed_AT_gmail.com>
 * @copyright 2018
 * @license MIT
 */
const _ = require('lodash');

/** 
 * @enum
 */
let __cfg = {
  /** 
   * @type {Number} 0|1 By default 1
   */
  warning: 1,
  /** 
   * @type {String} By default 'searchable' 
   */
  methodName: 'searchable'
};

/**
 * @description List of available options for a route
 * @enum
 */
const _defaultOptionsValues = {
  /**
   * @type {Number} Display n items per page, By default 10
   */
  defaultLimit        : 10,
  /** 
   * @type {Object} Default mongoose conditions 
   */
  searchParams        : {},
  /** 
   * @type {Object} Default fields to get 
   */
  defaultFields       : {},
  /** 
   * @type {Object} Mongoose options { order... } 
   */
  defaultQueryOptions : {}
};

/**
 * Set a new GET route in router object
 * - constraint : router must be set
 * - constraint : model must be set
 * - constraint : routePath must be set
 * 
 * @function restList
 * 
 * @param {Router} router Express Router object
 * @param {Object} model Mongoose model
 * @param {String} routePath Route path
 * @param {Array} Middlewares Array of middlewares
 * @param {Object} options Query options 
 * 
 * @example restList(router, Items, '/list_items')
 * 
 * @tutorial how_to_use
 */
function RestApiList(router, model, routePath, middlewares, options) {
  if(!router || !model || !routePath) {
    throw new Error('Error, missing parameter');
  }
  
  // Set default values to prevent errors
  options = _.extend({}, _defaultOptionsValues, options);
  middlewares = middlewares || [];

  if(__cfg.warning === 1 && typeof model[__cfg.methodName] !== "function") 
    console.log('RestApiList : Warning searchable is not defined for model ' + model.modelName);

  // Format path to prevent errors
  if(!routePath.match(/^\//))
    routePath = '/' + routePath;

  // Route callback
  const callback = (req, res) => {
    // By default we sort by _id because this field always exists
    const sort = !!req.query.sort ? req.query.sort : "_id";
    const sortDirection = !!req.query.direction ? req.query.direction : "DESC";

    // Object we gonna use to query our database
    let searchObject = {};

    // Adding optional conditions
    let defaultConditions = _.cloneDeep(options.searchParams);
    let filter = req.query.filter || "";

    //=================================================
    // Filter our content
    // If there is a filter apply it with each searchable fields in our model
    if(!!filter) {
      // Merge filter with searchable
      let searchable = (typeof model.searchable === "function") ? model[__cfg.methodName]() : [];
  
      searchable.map(field => {
        if(!searchObject.$or) {
          searchObject.$or = [];
        }
  
        searchObject.$or.push(
          _.extend({}, defaultConditions, { [field]: new RegExp(filter) })
        );
      })
    }
    // If there is no filter, get default conditions
    else {
      searchObject = defaultConditions;
    }

    // Set the page items limit
    let limit = parseInt(req.query.limit, 10) || options.defaultLimit;

    // Offset with asked page
    let offset = req.query.page > 1 ? 
      (parseInt(req.query.page, 10) - 1) * limit : 0;

    // Apply our sorting
    let queryOptions = _.extend({}, options.defaultQueryOptions, {
      order: [{
        field: sort,
        direction: sortDirection
      }]
    });

    model
      .find(searchObject, options.defaultFields, queryOptions)
      .then(results => {
        let totalResults = results.length;
        let totalPages = 1;
        let newResults = results;

        // Let's calculate our page limit
        if(limit > 0) {
          totalPages = Math.floor(totalResults / limit);

          if(totalResults % limit > 0) 
            totalPages += 1;

          newResults = results.splice(offset, limit);
        }

        // Return our page results
        return res.json({
          results: newResults,
          currentPage: parseInt(req.query.page, 10) || 1,
          limit,
          totalPages,
          totalResults
        });

      })
      .catch(err => reject(err));
  }

  // Merge all parameters to apply it to router.get
  let args = _.union([routePath], middlewares, [callback]);

  return router.get.apply(router, args);
}

/**
 * @description Configure RestList
 * 
 * @function configure
 * @param {Object} params 
 * 
 * @example 
 * restList.configure({
 *    warning: 0,
 *    methodName: 'displayFields'
 * })
 */
RestApiList.configure = params => { __cfg = params; }

module.exports = RestApiList;