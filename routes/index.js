const express = require('express');
const router = express.Router();

const { Octokit } = require('@octokit/rest')

router.get('/test', async function (req, res, next) {
    // Octokit.js
    // https://github.com/octokit/core.js#readme
    const octokit = new Octokit({
        // auth: req.query.token
    });

    // const lastCommit = await getBranchLastCommit(octokit, req.query.owner, req.query.repo, 'test');
    // console.log(lastCommit.data);
    const firstCommitSHA = await getFirstCommit(octokit, req.query.owner, req.query.repo, 'master');
    const firstCommit = await getACommit(octokit, req.query.owner, req.query.repo, firstCommitSHA);
    console.log(firstCommit.data);
    res.send(firstCommit.data);
});

// todo: deleted branches?
// todo: end date...
// todo: committers?
router.get('/graph-branch/all', async function (req, res, next) {
    // Octokit.js
    // https://github.com/octokit/core.js#readme
    const octokit = new Octokit({
        auth: req.query.token
    });
    let result = await getAllBranches(octokit, req);
    const branches = [];

    // console.log(result.data);
    for (const i in result.data) {
        // console.log(result.data[i])
        if (result.data[i].name === 'master' || result.data[i].name === 'main') {
            continue;
        }
        const lastCommit = await getBranchLastCommit(octokit, req.query.owner, req.query.repo, result.data[i].name);
        const firstCommitSHA = await getFirstCommit(octokit, req.query.owner, req.query.repo, result.data[i].name);
        const firstCommit = await getACommit(octokit, req.query.owner, req.query.repo, firstCommitSHA);
        branches.push({
            'name': result.data[i].name,
            'endDate': new Date(lastCommit.data.commit.commit.committer.date),
            'startDate': new Date(firstCommit.data.commit.committer.date),
            'committer': lastCommit.data.commit.commit.committer.name,
        });
    }

    console.log(branches);
    res.send(branches);
});

// Find where a branch was created (return sha of the last commit)
// todo: optimize complexity
async function getFirstCommit(octokit, owner, repo, branch) {
    let result = await getBranchLastCommit(octokit, owner, repo, branch);
    let branchCommitSHA = result.data.commit.sha;
    console.log('branchCommitSHA: ' + branchCommitSHA);

    result = await getBranchLastCommit(octokit, owner, repo, 'master');
    let baseCommitSHA = result.data.commit.sha;
    console.log('baseCommitSHA: ' + baseCommitSHA);
    console.log();

    const commitSet = new Set([branchCommitSHA, baseCommitSHA]);
    let temp = 2;
    while (temp > 0) {
        // Find parent of current branch commit
        if (branchCommitSHA) {
            result = await getACommit(octokit, owner, repo, branchCommitSHA);
            if (result.data.parents[0]) {
                const lastBranchCommitSHA = branchCommitSHA;
                branchCommitSHA = result.data.parents[0].sha;
                console.log('branchCommitSHA: ' + branchCommitSHA);
                if (!branchCommitSHA) {
                    console.log('Start of a branch not found!')
                    break;
                }
                if (commitSet.has(branchCommitSHA)) {
                    // return branchCommitSHA;
                    return lastBranchCommitSHA;
                } else {
                    commitSet.add(branchCommitSHA);
                }
            } else {
                branchCommitSHA = result.data.parents[0];   //
                temp--;
            }
        }

        // Find parent of base branch
        if (baseCommitSHA) {
            result = await getACommit(octokit, owner, repo, baseCommitSHA);
            if (result.data.parents[0]) {
                const lastBaseCommitSHA = baseCommitSHA;
                baseCommitSHA = result.data.parents[0].sha;
                console.log('baseCommitSHA: ' + baseCommitSHA);
                if (!baseCommitSHA) {
                    console.log('Start of a branch not found!')
                    break;
                }
                if (commitSet.has(baseCommitSHA)) {
                    // return baseCommitSHA;
                    return lastBaseCommitSHA;
                } else {
                    commitSet.add(baseCommitSHA);
                }
            } else {
                baseCommitSHA = result.data.parents[0];   //
                temp--;
            }
        }

        console.log();
    }
}

async function getAllBranches(octokit, req) {
    // List branches (https://docs.github.com/en/rest/branches/branches?apiVersion=2022-11-28#list-branches)
    return await octokit.request('GET /repos/{owner}/{repo}/branches', {
        owner: req.query.owner,
        repo: req.query.repo,
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    });
}

async function getBranchLastCommit(octokit, owner, repo, branch) {
    // Get a commit (https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#get-a-commit)
    return await octokit.request('GET /repos/{owner}/{repo}/branches/{branch}', {
        owner: owner,
        repo: repo,
        branch: branch,
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    });
}

async function getACommit(octokit, owner, repo, sha) {
    // Get a branch (https://docs.github.com/en/rest/branches/branches?apiVersion=2022-11-28#get-a-branch)
    return await octokit.request('GET /repos/{owner}/{repo}/commits/{ref}', {
        owner: owner,
        repo: repo,
        ref: sha,
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    });
}

router.get('/branch', async function (req, res, next) {
    // Octokit.js
    // https://github.com/octokit/core.js#readme
    const octokit = new Octokit({
        auth: req.query.token
    });

    const result = await octokit.request('GET /repos/{owner}/{repo}/branches/{branch}', {
        owner: req.query.owner,
        repo: req.query.repo,
        branch: req.query.branch,
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    });
    res.send(result.data);
});

// List commits (https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#list-commits)
router.get('/commit/all', async function (req, res, next) {
    // Octokit.js
    // https://github.com/octokit/core.js#readme
    const octokit = new Octokit({
        auth: req.query.token
    })

    const result = await octokit.request('GET /repos/{owner}/{repo}/commits', {
        owner: req.query.owner,
        repo: req.query.repo,
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    })
    res.send(result.data);
});

// Get a commit (https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#get-a-commit)
router.get('/commit', async function (req, res, next) {
    // Octokit.js
    // https://github.com/octokit/core.js#readme
    const octokit = new Octokit({
        auth: req.query.token
    });

    const result = await octokit.request('GET /repos/{owner}/{repo}/commits/{ref}', {
        owner: req.query.owner,
        repo: req.query.repo,
        ref: req.query.ref,
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    });
    res.send(result.data);
});

// // Compare two commits (https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#compare-two-commits)
// router.get('/commit/compare', async function (req, res, next) {
//     // Octokit.js
//     // https://github.com/octokit/core.js#readme
//     const octokit = new Octokit({
//         // auth: req.query.token
//     })
//
//     const result = await octokit.request('GET /repos/{owner}/{repo}/compare/{basehead}', {
//         owner: req.query.owner,
//         repo: req.query.repo,
//         basehead: req.query.basehead,
//         headers: {
//             'X-GitHub-Api-Version': '2022-11-28'
//         }
//     })
//     res.send(result.data);
// });

module.exports = router;
