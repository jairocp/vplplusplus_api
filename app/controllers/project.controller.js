const Config = global.Config;
const UserService = require(Config.paths.services + '/user/user.service');
const ProjectService = require(Config.paths.services + '/project/project.service');

module.exports.get = get;
async function get(req, res, next) {
	try {
		const CurrentUser = UserService.getUserFromResponse(res)
		const Projects = await ProjectService.listUsingTheRequest(CurrentUser, req)
		res.send(Projects)
	} catch (e) {
		next(e)
	}

}

module.exports.compile = compile
async function compile(req, res, next) {
	try {
		const CurrentUser = UserService.getUserFromResponse(res)
		const code = await ProjectService.compile(CurrentUser, req.params.id)
		res.send(code)
	} catch (e) {
		next(e)
	}

}

module.exports.create = create;
async function create(req, res, next) {
	try {
		const CurrentUser = UserService.getUserFromResponse(res)
		const Project = await ProjectService.create(CurrentUser, req.body)
		res.send(Project)
	} catch (e) { next(e) }

}

module.exports.delete = deleteProject;
async function deleteProject(req, res, next) {
	try {
		const CurrentUser = UserService.getUserFromResponse(res)
		const ProjectDeleted = await ProjectService.delete(CurrentUser, req.params.id)
		res.send(ProjectDeleted)
	} catch (e) { next(e) }

}

module.exports.update = update;
async function update(req, res, next) {
	try {
		res.send("ok project controller")
	} catch (e) { next(e) }
}

module.exports.export = _export;
function _export(type) {
	return async function (req, res, next) {
		try {
			res.send("ok project controller")
		} catch (e) { next(e) }
	}

}