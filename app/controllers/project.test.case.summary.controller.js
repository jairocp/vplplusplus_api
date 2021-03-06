const Config = global.Config;
const Util = require(Config.paths.utils);
const moment = require('moment')
const ReportErrors = require(Config.paths.errors + '/report.errors');
const UserService = require(Config.paths.services + '/user/user.service');
const ProjectService = require(Config.paths.services + '/project/project.service');
const TestCaseService = require(Config.paths.services + '/project/project.test.case.service');
const TopicService = require(Config.paths.services + '/topic/topic.service');
const SummaryService = require(Config.paths.services + '/project/project.summary.service');
const SummaryReportService = require(Config.paths.services + '/project/project.summary.report.service');


const getTimelineVariablesFromQuery = (ProjectDoc, fromQuery, eachQuery, stepsQuery) => {

	const from = fromQuery
		? moment(fromQuery)
		: ProjectDoc
			? moment(ProjectDoc.createdAt)
			: moment()

	from.set('hour', 0).set('minute', 0)
	const each = isNaN(eachQuery) ? 6 : (eachQuery * 1)
	const steps = isNaN(stepsQuery) ? 6 : (stepsQuery * 1)
	const limit = each * steps
	return { from, each, steps, limit }
}

const getTimeline = async (CurrentUser, project, student, opts) => {
	const { format, type, from, each, limit, topic } = opts
	const fromString = from.format(format)
	let period = each

	const promises = []
	const arrayOfDates = []

	while (period <= limit) {
		const toMoment = from.clone().add(period, type).set('hour', 0).set('minute', 0)
		const to = toMoment.format(format)
		const reportConf = { from: fromString, to, topic }
		const promise = SummaryReportService.getUserReport(CurrentUser, project, student, reportConf)
		arrayOfDates.push({ from, to: toMoment, tag: to })
		promises.push(promise)
		period += each
	}

	const promiseResults = await Promise.all(promises)

	const result = promiseResults
		.map((data, idx) => {
			const { from, to, tag } = arrayOfDates[idx]
			const sumOfSkill = data.reduce((sum, userReport) => {
				return userReport.skill + sum
			}, 0)
			const skill = sumOfSkill / data.length
			return {
				from,
				to,
				tag,
				skill
			}
		})

	return result
}

const getProjectTimelineHOC = async (project, req, res) => {


	const {
		from: fromQuery
		, each: eachQuery // each 6 months is a semestre
		, steps: stepsQuery  // take the first forth semestres
		, format = "YYYY-MM-DD"
		, type = 'months'
		, topic = []
		, separeByTopic: separeByTopicString = "false"
	} = req.query


	const CurrentUser = UserService.getUserFromResponse(res)
	const ExtraData = Promise.all(
		[
			ProjectService.get(CurrentUser, { _id: project }, { populate: false }),
			TopicService.list({ name: { $in: topic } })
		]
	)

	const [ProjectDoc, TopicDocs] = await ExtraData

	const topicMap = TopicDocs.reduce((acc = {}, t) => ({ ...acc, [t.name]: t }), {})
	const separeByTopic = separeByTopicString === 'true'
	const timelineVariables = getTimelineVariablesFromQuery(ProjectDoc, fromQuery, eachQuery, stepsQuery)
	const shouldFindByProject = !!project
	const { name, description, activity } = ProjectDoc || {}

	return async (student) => {

		const projectId = shouldFindByProject ? ProjectDoc._id : undefined

		if (TopicDocs.length && separeByTopic) {

			const promises = TopicDocs.map(TopicDoc => {
				const opts = { format, type, ...timelineVariables, topic: [TopicDoc.name] }
				return getTimeline(CurrentUser, projectId, student, opts)
			})

			const resultOfPromises = await Promise.all(promises)
			const datasets = resultOfPromises.map((dataset, idx) => {
				const TopicDoc = TopicDocs[idx]
				const label = shouldFindByProject
					? {
						topic: [topicMap[TopicDoc.name]],
						project: {
							name,
							description,
							activity
						}
					} : { topic: [topicMap[TopicDoc.name]] }
				return { label, dataset }
			})

			return { project: ProjectDoc, reports: datasets }

		}

		const TopicNamesArray = TopicDocs.length
			? TopicDocs.map(({ name }) => name)
			: []
		const dataset = await getTimeline(CurrentUser, projectId, student, { format, type, ...timelineVariables, topic: TopicNamesArray })
		const label = shouldFindByProject
			? {
				topic: TopicDocs,
				project: {
					name,
					description,
					activity
				}
			} : { topic: TopicDocs }

		const reports = [{ label, dataset }]
		return { project: ProjectDoc, reports }

	}
}

const getQueryWeight = (req) => {
	const { id: projectIdInParams } = req.params
	const {
		separeByTopic,
		separeByProject = "true",
		project: rProject = [],
		topic: rTopic = [],
		steps = 1
	} = req.query

	const project = Array.isArray(rProject) ? rProject : [rProject]
	const topic = Array.isArray(rTopic) ? rTopic : [rTopic]


	const currentUserCalls = 1
	const topicCalls = separeByTopic === "true" ? topic.length : 1
	const projectInParamCall = projectIdInParams ? 1 : 0
	const projectCalls = separeByProject === "true" ? (project.length + projectInParamCall) : 1
	const projectByTopicCalls = topicCalls * projectCalls
	const dateRangesCalls = steps
	const weight = currentUserCalls + (projectByTopicCalls * dateRangesCalls)
	return weight

}

module.exports.getProjectReportTimeline = getProjectReportTimeline
async function getProjectReportTimeline(req, res, next) {
	try {

		valideHugeQuery(req)

		const { id: projectParam } = req.params
		const { project: projectQuery = [] } = req.query

		const ArrayOfProjectInQuery = Array.isArray(projectQuery)
			? projectQuery
			: [projectQuery]

		const ArrayOfProjects = ArrayOfProjectInQuery.length
			? ArrayOfProjectInQuery
			: projectParam
				? [projectParam]
				: []

		const results = []
		for (let i = 0; i < ArrayOfProjects.length; i++) {
			const projectId = ArrayOfProjects[i]
			const getTimelineFn = await getProjectTimelineHOC(projectId, req, res)
			const result = await getTimelineFn()
			results.push(result)
		}

		res.send(results)

	} catch (e) { next(e) }
}

module.exports.getStudentReportTimeline = getStudentReportTimeline
async function getStudentReportTimeline(req, res, next) {

	try {

		valideHugeQuery(req)

		const { moodle_student_id } = req.params
		const { id: projectParam } = req.params
		const { project: projectQuery = [] } = req.query

		const ArrayOfProjectInQuery = Array.isArray(projectQuery)
			? projectQuery
			: [projectQuery]

		const ArrayOfProjects = ArrayOfProjectInQuery.length
			? ArrayOfProjectInQuery
			: projectParam
				? [projectParam]
				: []

		if (ArrayOfProjects.length) {

			const getTimelineFNS = await Promise.all(ArrayOfProjects.map(projectId => getProjectTimelineHOC(projectId, req, res)))
			const arrayOfResults = await Promise.all(getTimelineFNS.map(getTimelineFn => getTimelineFn(moodle_student_id)))
			return res.send(arrayOfResults)

			// for (let i = 0; i < ArrayOfProjects.length; i++) {
			// 	const projectId = ArrayOfProjects[i]
			// 	const getTimelineFn = await getProjectTimelineHOC(projectId, req, res)
			// 	const result = await getTimelineFn(moodle_student_id)
			// 	results.push(result)
			// }

		} else {
			const getTimelineFn = await getProjectTimelineHOC(null, req, res)
			const result = await getTimelineFn(moodle_student_id)
			return res.send([result])
		}

	} catch (e) { next(e) }

}

module.exports.getTopicTimeline = getTopicTimeline
async function getTopicTimeline(req, res, next) {
	try {

		const CurrentUser = UserService.getUserFromResponse(res)
		const {
			from: fromQuery = CurrentUser.createdAt
			, each: eachQuery
			, steps: stepsQuery
			, format = "YYYY-MM-DD"
			, type = 'months'
		} = req.query


		const TestCaseDocs = await TestCaseService.list(CurrentUser)
		const topicIdsMap = TestCaseDocs.reduce((map, testcase) => {
			testcase.topic.forEach(topicId => {
				if (!map[topicId]) map[topicId] = topicId
			})
			return map
		}, {})

		const topics = Object.values(topicIdsMap)
		const topicQuery = { _id: { $in: topics } }
		const TopicDocs = await TopicService.list(topicQuery)
		const opts = getTimelineVariablesFromQuery(null, fromQuery, eachQuery, stepsQuery)
		const promises = TopicDocs.map(TopicDoc => getTimeline(CurrentUser, null, null, { ...opts, format, type, topic: TopicDoc.name }))
		const promiseResults = await Promise.all(promises)
		const reports = promiseResults.map((dataset, idx) => ({ label: { topic: TopicDocs[idx] }, dataset }))
		res.send([{ project: { name: 'Topics project' }, reports }])

	} catch (e) { next(e) }
}


module.exports.getUserReports = getUserReports
async function getUserReports(req, res, next) {

	try {
		const { moodle_student_id, id: project_id } = req.params
		const { from, to, topic } = req.query
		const opts = { from, to, topic }
		const CurrentUser = UserService.getUserFromResponse(res)
		const userid = moodle_student_id ? +moodle_student_id : undefined
		const report = await SummaryReportService.getUserReport(CurrentUser, project_id, userid, opts)
		const stadistics = {
			mostDifficultTest: SummaryReportService.getTestCasesByDifficult(report),
			mostSkilledStudents: SummaryReportService.getTheMostSkilledStudentByTopic(report),
			avg: report.reduce((sum, userReport) => userReport.skill + sum, 0) / report.length
		}
		res.send({ report, stadistics, options: opts })
	} catch (e) { next(e) }

}

module.exports.create = create;
async function create(req, res, next) {
	try {
		const {
			project,
			moodle_user,
			data,
			compilation_error
		} = req.body

		const studentTestResults = compilation_error
			? await SummaryService.createSummariesForCompilationError(project)
			: data

		console.log(studentTestResults)

		const SummaryDoc = await SummaryService.createAll(project, moodle_user, studentTestResults)
		res.send(SummaryDoc)
	} catch (e) { next(e) }

}

const valideHugeQuery = (req) => {
	const queryWeight = getQueryWeight(req)

	if (queryWeight >= 350) {
		throw new Util.Error(ReportErrors.too_weight)
	}
}
