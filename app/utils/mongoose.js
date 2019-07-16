
import { set } from 'lodash'

const ObjectId = require('mongoose').Types.ObjectId;

const paginationAttributes = {
	limit: "limit",
	page: "page",
	sort: "sort"
}

function cleanPaginatorAttributesFromRequest(req) {
	if (req.query[paginationAttributes.limit]) {
		delete req.query[paginationAttributes.limit];
	}
	if (req.query[paginationAttributes.page]) {
		delete req.query[paginationAttributes.page];
	}

	if (req.query[paginationAttributes.sort]) {
		delete req.query[paginationAttributes.sort];
	}

	if (req.query.populate) {
		delete req.query.populate;
	}
}

function parsePathsToPopulates(arrayOfPaths, selects = {}) {
	const reduceArrayOfPathsToPopulateSchema = (out, path, index) => set(out, path, false)
	const parcePopulateSchemaToPopulates =
		populateSchema => Object
			.keys(populateSchema)
			.map(model => {
				const children = populateSchema[model]
				const hasChildren = !!children
				const selectArray = selects[model] || []
				return {
					path: model,
					select: selectArray.concat('_id'),
					populate: !hasChildren ? [] : parcePopulateSchemaToPopulates(children)
				}
			})
	const populateSchema = arrayOfPaths.reduce(reduceArrayOfPathsToPopulateSchema, {})
	const populates = parcePopulateSchemaToPopulates(populateSchema)
	return populates
}

module.exports.getPaginatorFromRequest = getPaginatorFromRequest;
function getPaginatorFromRequest(req, defaults = {}, populates, selects) {
	const {
		limit = defaults[paginationAttributes.limit],
		page = defaults[paginationAttributes.page]
	} = req.query
	const reqPopulate = req.query.populate
	const arrayOfPopulates = populates || reqPopulate
		? Array.isArray(reqPopulate)
			? reqPopulate
			: [reqPopulate]
		: []
	const populate = parsePathsToPopulates(arrayOfPopulates, selects)
	const paginator = { limit, page, populate }
	cleanPaginatorAttributesFromRequest(req);
	return paginator
}


module.exports.getQueryFromRequest = getQueryFromRequest;
function getQueryFromRequest(req) {
	let query = Object.assign({}, req.query)
	return query;
}

module.exports.list = list;
function list(Model, id, query, paginator) {
	if (id && !Object.keys(query)) return Model.findById(id);
	if (id) query._id = id;
	return Model.paginate(query, paginator);
}

module.exports.createObjectId = () => new ObjectId()