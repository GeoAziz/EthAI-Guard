/**
 * GitHub Issues Notification Handler
 * 
 * Creates GitHub Issues for critical drift alerts.
 */

/**
 * Create GitHub issue for critical alert
 * @param {Object} alert - Drift alert object
 * @param {string} token - GitHub personal access token
 * @param {string} repo - Repository in format "owner/repo"
 */
async function createGitHubIssue(alert, token, repo) {
  if (!token || !repo) {
    console.warn('GitHub integration not configured');
    return { success: false, error: 'GitHub not configured' };
  }

  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) {
    return { success: false, error: 'Invalid repo format (use owner/repo)' };
  }

  const severityLabel = alert.severity === 'critical' ? 'critical' : 'warning';
  const typeLabel = alert.type.replace(/_/g, '-');

  const issueBody = `## 🚨 Drift Alert: ${alert.type.replace(/_/g, ' ')}

**Severity**: ${alert.severity.toUpperCase()}  
**Model ID**: \`${alert.model_id}\`  
**Metric**: \`${alert.metric_name}\`

### Metrics

| Metric | Value |
|--------|-------|
| Current Value | ${alert.metric_value.toFixed(4)} |
| Threshold | ${alert.threshold.toFixed(4)} |
| Occurrences | ${alert.occurrence_count || 1} |

### Time Window

- **Start**: ${new Date(alert.window_start).toISOString()}
- **End**: ${new Date(alert.window_end).toISOString()}

### Details

\`\`\`json
${JSON.stringify(alert.details || {}, null, 2)}
\`\`\`

### Recommended Actions

${alert.severity === 'critical' ? `
- [ ] Review model performance metrics
- [ ] Investigate root cause of drift
- [ ] Consider model retraining
- [ ] Update baseline if drift is expected
` : `
- [ ] Monitor for continued drift
- [ ] Review recent data changes
- [ ] Document findings
`}

---

**Alert ID**: \`${alert._id}\`  
**Created**: ${new Date(alert.created_at).toISOString()}  
**Dashboard**: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/monitor/drift?alert_id=${alert._id}

*This issue was automatically created by EthixAI-Guard Drift Detection.*
`;

  const issueData = {
    title: `[${severityLabel.toUpperCase()}] ${alert.type.replace(/_/g, ' ')}: ${alert.metric_name} (${alert.model_id})`,
    body: issueBody,
    labels: ['drift-alert', severityLabel, typeLabel, 'automated'],
    assignees: process.env.GITHUB_ASSIGNEES ? process.env.GITHUB_ASSIGNEES.split(',') : []
  };

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/issues`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(issueData)
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('GitHub API error:', errorData);
      return { success: false, error: errorData.message };
    }

    const issue = await response.json();
    console.log(`GitHub issue created for alert ${alert._id}: ${issue.html_url}`);
    return { success: true, issueUrl: issue.html_url, issueNumber: issue.number };
  } catch (error) {
    console.error('Failed to create GitHub issue:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add comment to existing GitHub issue
 * @param {number} issueNumber - Issue number
 * @param {string} comment - Comment text
 * @param {string} token - GitHub personal access token
 * @param {string} repo - Repository in format "owner/repo"
 */
async function addIssueComment(issueNumber, comment, token, repo) {
  if (!token || !repo) {
    return { success: false, error: 'GitHub not configured' };
  }

  const [owner, repoName] = repo.split('/');

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ body: comment })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message };
    }

    const commentData = await response.json();
    return { success: true, commentUrl: commentData.html_url };
  } catch (error) {
    console.error('Failed to add comment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Close GitHub issue when alert is resolved
 * @param {number} issueNumber - Issue number
 * @param {string} resolution - Resolution note
 * @param {string} token - GitHub personal access token
 * @param {string} repo - Repository in format "owner/repo"
 */
async function closeIssue(issueNumber, resolution, token, repo) {
  if (!token || !repo) {
    return { success: false, error: 'GitHub not configured' };
  }

  const [owner, repoName] = repo.split('/');

  // Add resolution comment
  const comment = `## ✅ Alert Resolved

${resolution}

*This issue was automatically closed by EthixAI-Guard.*`;

  await addIssueComment(issueNumber, comment, token, repo);

  // Close issue
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/issues/${issueNumber}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ state: 'closed' })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to close issue:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  createGitHubIssue,
  addIssueComment,
  closeIssue
};
