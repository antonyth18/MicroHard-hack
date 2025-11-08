import express from 'express';

const router = express.Router();

// Environment variable checks
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI;

// Validate required environment variables at router load time
if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !GITHUB_REDIRECT_URI) {
  console.warn('⚠️  GitHub OAuth Configuration Warning:');
  if (!GITHUB_CLIENT_ID) {
    console.warn('  - GITHUB_CLIENT_ID is not set');
  }
  if (!GITHUB_CLIENT_SECRET) {
    console.warn('  - GITHUB_CLIENT_SECRET is not set');
  }
  if (!GITHUB_REDIRECT_URI) {
    console.warn('  - GITHUB_REDIRECT_URI is not set');
  }
  console.warn('  GitHub PR Mode endpoints will not function properly without these values.');
}

/**
 * GET /api/github/login
 * Initiates GitHub OAuth flow
 * 
 * Redirects user to GitHub authorization URL with proper OAuth parameters.
 * User will be prompted to authorize the app on GitHub.
 * 
 * Expected query params: None
 * Returns: Redirect to GitHub OAuth authorization page
 */
router.get('/login', (req, res) => {
  if (!GITHUB_CLIENT_ID || !GITHUB_REDIRECT_URI) {
    return res.status(500).json({
      error: 'GitHub OAuth not configured',
      message: 'Missing GITHUB_CLIENT_ID or GITHUB_REDIRECT_URI environment variables'
    });
  }

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.append('client_id', GITHUB_CLIENT_ID);
  githubAuthUrl.searchParams.append('redirect_uri', GITHUB_REDIRECT_URI);
  githubAuthUrl.searchParams.append('scope', 'repo');
  githubAuthUrl.searchParams.append('allow_signup', 'true');
  
  res.redirect(githubAuthUrl.toString());
});

/**
 * GET /api/github/callback
 * Handles GitHub OAuth callback
 * 
 * Exchanges the authorization code for an access token and redirects
 * the user to the frontend with the token.
 * 
 * Expected query params: code
 * Returns: Redirect to client app with token
 */
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  
  // Always redirect to frontend, even on errors (to avoid pretty-print page)
  if (!code) {
    const errorMsg = encodeURIComponent('Missing authorization code from GitHub');
    return res.redirect(`${frontendUrl}#error=${errorMsg}`);
  }

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    const errorMsg = encodeURIComponent('GitHub OAuth not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in your .env file.');
    return res.redirect(`${frontendUrl}#error=${errorMsg}`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ GitHub OAuth token exchange failed:', tokenResponse.status, errorText);
      const errorMsg = encodeURIComponent(`GitHub OAuth failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
      return res.redirect(`${frontendUrl}#error=${errorMsg}`);
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      const errorDescription = tokenData.error_description || tokenData.error || 'No access token received';
      console.error('❌ GitHub OAuth error:', tokenData);
      
      // Provide helpful error messages
      let errorMsg = 'GitHub OAuth failed';
      if (errorDescription.includes('client_id') || errorDescription.includes('client_secret')) {
        errorMsg = 'GitHub OAuth configuration error: Please check your GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in your .env file.';
      } else if (errorDescription.includes('redirect_uri')) {
        errorMsg = 'GitHub OAuth redirect URI mismatch: Please ensure GITHUB_REDIRECT_URI matches your GitHub app settings.';
      } else {
        errorMsg = `GitHub OAuth failed: ${errorDescription}`;
      }
      
      return res.redirect(`${frontendUrl}#error=${encodeURIComponent(errorMsg)}`);
    }

    const accessToken = tokenData.access_token;

    // Redirect to frontend with token in hash (not query param) to avoid pretty-print
    const redirectUrl = `${frontendUrl}#token=${accessToken}`;
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('❌ GitHub OAuth callback error:', error);
    const errorMsg = encodeURIComponent(`GitHub OAuth failed: ${error.message}`);
    return res.redirect(`${frontendUrl}#error=${errorMsg}`);
  }
});

/**
 * GET /api/github/repos
 * Fetches user's GitHub repositories
 * 
 * Retrieves a list of repositories accessible to the authenticated user.
 * Requires a valid GitHub access token in the Authorization header.
 * 
 * Expected headers: Authorization (Bearer token)
 * Returns: JSON object with repos array
 */
router.get('/repos', async (req, res) => {
  console.log('📡 Fetching repos...');
  const authHeader = req.headers.authorization;
  console.log('Auth header:', authHeader ? 'Present' : 'Missing');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ Auth header validation failed');
    return res.status(401).json({
      error: 'Missing access token',
      message: 'Authorization header with Bearer token is required'
    });
  }

  const accessToken = authHeader.substring(7);

  try {
    console.log('🔄 Making request to GitHub API...');
    // Fetch user's repositories from GitHub API
    const reposResponse = await fetch('https://api.github.com/user/repos', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'AIReviewMate'
      }
    });

    if (reposResponse.status === 401) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        message: 'Please re-authenticate with GitHub'
      });
    }

    if (!reposResponse.ok) {
      throw new Error(`GitHub API responded with status ${reposResponse.status}`);
    }

    const reposData = await reposResponse.json();

    // Extract and format relevant repository information
    const repos = reposData.map(repo => ({
      name: repo.name,
      full_name: repo.full_name,
      owner: repo.owner.login,
      default_branch: repo.default_branch,
      url: repo.html_url
    }));

    res.json({ repos });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch repositories',
      message: error.message
    });
  }
});

/**
 * POST /api/github/pull-request
 * Creates a pull request with AI-reviewed code
 * 
 * Creates a new branch, commits the improved code, and opens a pull request
 * against the main branch with AI review suggestions.
 * 
 * Expected body: { accessToken, owner, repo, filePath, improvedCode, category, explanation }
 * Returns: PR details object with URL
 */
router.post('/pull-request', async (req, res) => {
  const { accessToken, owner, repo, filePath, improvedCode, category, explanation } = req.body;
  
  if (!accessToken || !owner || !repo || !filePath || !improvedCode || !category || !explanation) {
    return res.status(400).json({
      error: 'Missing required fields'
    });
  }

  // Generate unique branch name
  const branchName = `aireviewmate-update-${Date.now()}`;
  
  const githubApiHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'AIReviewMate'
  };

  try {
    // Step A: Fetch base branch (main) SHA
    const refResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/main`,
      {
        method: 'GET',
        headers: githubApiHeaders
      }
    );

    if (refResponse.status === 401) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        message: 'Please re-authenticate with GitHub'
      });
    }

    if (!refResponse.ok) {
      throw new Error(`Failed to fetch main branch: ${refResponse.status}`);
    }

    const refData = await refResponse.json();
    const mainBranchSHA = refData.object.sha;

    // Step B: Create new branch
    const createBranchResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
        method: 'POST',
        headers: githubApiHeaders,
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: mainBranchSHA
        })
      }
    );

    if (createBranchResponse.status === 409) {
      return res.status(409).json({
        error: 'Branch conflict',
        message: 'A branch with this name already exists. Please try again.'
      });
    }

    if (!createBranchResponse.ok) {
      throw new Error(`Failed to create branch: ${createBranchResponse.status}`);
    }

    // Step C: Get current file info
    const fileResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: 'GET',
        headers: githubApiHeaders
      }
    );

    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.status}`);
    }

    const fileData = await fileResponse.json();
    const fileSHA = fileData.sha;

    // Step D: Commit improved code
    const improvedCodeBase64 = Buffer.from(improvedCode).toString('base64');
    
    const commitResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: githubApiHeaders,
        body: JSON.stringify({
          message: `AIReviewMate: ${category}`,
          content: improvedCodeBase64,
          sha: fileSHA,
          branch: branchName
        })
      }
    );

    if (!commitResponse.ok) {
      throw new Error(`Failed to commit code: ${commitResponse.status}`);
    }

    // Step E: Create Pull Request
    const prResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        method: 'POST',
        headers: githubApiHeaders,
        body: JSON.stringify({
          title: `AI Review Suggestion: ${category}`,
          head: branchName,
          base: 'main',
          body: explanation
        })
      }
    );

    if (!prResponse.ok) {
      const errorData = await prResponse.json().catch(() => ({}));
      throw new Error(`Failed to create PR: ${prResponse.status} - ${errorData.message || 'Unknown error'}`);
    }

    const prData = await prResponse.json();

    // Return success
    res.json({
      success: true,
      url: prData.html_url,
      number: prData.number,
      branch: branchName
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to create pull request',
      message: error.message
    });
  }
});

export default router;
