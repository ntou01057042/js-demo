const express = require('express');
const router = express.Router();

const { Octokit } = require('@octokit/rest')

// todo: deleted branches?
// todo: end date...
// todo: authors
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
        const lastCommit = await getBranchLastCommit(octokit, req.query.owner, req.query.repo, result.data[i].name);
        const firstCommitSHA = await getFirstCommit(octokit, req.query.owner, req.query.repo, result.data[i].name);
        const firstCommit = await getACommit(octokit, req.query.owner, req.query.repo, firstCommitSHA);
        branches.push({
            'name': result.data[i].name,
            'endDate': new Date(lastCommit.data.commit.commit.committer.date),
            'startDate': new Date(firstCommit.data.commit.committer.date),
        });
    }

    console.log(branches);
    res.send(branches);
});

// Find where a branch was created (return sha of the last commit)
// todo: optimize complexity
async function getFirstCommit(octokit, owner, repo, branch) {
    let result = await getBranchLastCommit(octokit, owner, repo, branch);
    let branchCommit = result.data.commit.sha;
    console.log('branchCommit: ' + branchCommit);

    result = await getBranchLastCommit(octokit, owner, repo, 'master');
    let baseCommit = result.data.commit.sha;
    console.log('baseCommit: ' + baseCommit);
    console.log();

    const commitSet = new Set([branchCommit, baseCommit]);
    let temp = 2;
    while (temp > 0) {
        // Find parent of current branch commit
        if (branchCommit) {
            result = await getACommit(octokit, owner, repo, branchCommit);
            branchCommit = result.data.parents[0];
            if (branchCommit) {
                branchCommit = result.data.parents[0].sha;
                console.log('branchCommit: ' + branchCommit);
                if (!branchCommit) {
                    console.log('Start of a branch not found!')
                    break;
                }
                if (commitSet.has(branchCommit)) {
                    return branchCommit;
                } else {
                    commitSet.add(branchCommit);
                }
            } else {
                temp--;
            }
        }

        // Find parent of base branch
        if (baseCommit) {
            result = await getACommit(octokit, owner, repo, baseCommit);
            baseCommit = result.data.parents[0];
            if (baseCommit) {
                baseCommit = result.data.parents[0].sha;
                console.log('baseCommit: ' + baseCommit);
                if (!baseCommit) {
                    console.log('Start of a branch not found!')
                    break;
                }
                if (commitSet.has(baseCommit)) {
                    return baseCommit;
                } else {
                    commitSet.add(baseCommit);
                }
            } else {
                temp--;
            }
        }

        console.log();
    }
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
