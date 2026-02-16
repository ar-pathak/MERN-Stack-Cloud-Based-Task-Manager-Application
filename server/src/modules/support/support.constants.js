const SUPPORT_CATEGORIES = [
    "account",
    "privacy",
    "posts",
    "analytics",
    "billing",
    "security"
];

const CATEGORY_LABELS = {
    account: "Account",
    privacy: "Privacy",
    posts: "Posts",
    analytics: "Analytics",
    billing: "Billing",
    security: "Security"
};

const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"];
const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"];
const FEEDBACK_TYPES = ["feature_request", "bug_report"];

const DEFAULT_HELP_ARTICLES = [
    {
        title: "Reset your password and secure sign in",
        slug: "reset-password-and-secure-sign-in",
        summary: "Recover account access, rotate passwords, and keep sign in activity secure.",
        category: "account",
        tags: ["password", "signin", "account"],
        featured: true,
        contentMarkdown: `# Reset your password and secure sign in

If you cannot access your account, follow this sequence to recover access quickly.

## 1. Reset password
- Open the reset password form from the login screen.
- Use your verified email address.
- Set a strong password with at least 12 characters.

## 2. Verify account activity
- Open active sessions in account settings.
- Revoke sessions you do not recognize.
- Sign in again on trusted devices.

## 3. Keep access safe
- Never share one time links.
- Use unique passwords for each app.
- Update your recovery email when your company domain changes.
`
    },
    {
        title: "Control privacy and audience visibility",
        slug: "control-privacy-and-audience-visibility",
        summary: "Manage who can view your profile, posts, and engagement details.",
        category: "privacy",
        tags: ["privacy", "visibility", "profile"],
        featured: false,
        contentMarkdown: `# Control privacy and audience visibility

Use privacy controls to decide what is public and what stays inside your team.

## Profile visibility
- Set profile visibility to public, followers, or private.
- Limit profile fields such as location and headline if needed.

## Post visibility
- Choose post visibility before publishing.
- Use private visibility for draft like internal updates.
- Review visibility settings after editing older posts.

## Extra privacy checks
- Remove sensitive data from screenshots.
- Confirm attachment previews before posting.
`
    },
    {
        title: "Troubleshoot post publishing and media uploads",
        slug: "troubleshoot-post-publishing-and-media-uploads",
        summary: "Fix common publishing issues, upload failures, and media processing delays.",
        category: "posts",
        tags: ["posts", "uploads", "media"],
        featured: false,
        contentMarkdown: `# Troubleshoot post publishing and media uploads

If a post fails to publish, check these common causes first.

## Upload checklist
1. Confirm your file is supported.
2. Keep each file within upload limits.
3. Avoid unstable networks during large uploads.

## Draft and scheduled posts
- Save as draft if you are editing over multiple sessions.
- Verify schedule time and timezone before confirmation.
- Re open the draft if publishing is interrupted.

## If upload still fails
- Retry with a smaller image.
- Rename files that include unusual symbols.
- Submit a support ticket and attach the screenshot of the error.
`
    },
    {
        title: "Understand analytics metrics and reporting delays",
        slug: "understand-analytics-metrics-and-reporting-delays",
        summary: "Interpret key metrics and know when analytics numbers are expected to refresh.",
        category: "analytics",
        tags: ["analytics", "metrics", "reports"],
        featured: true,
        contentMarkdown: `# Understand analytics metrics and reporting delays

Analytics is near real time for core totals and can lag for deeper audience charts.

## Core metrics
- Reach shows how many unique users saw your post.
- Engagement includes likes, comments, and shares.
- Conversion metrics can arrive later than interactions.

## Expected refresh windows
- Overview totals: usually within minutes.
- Audience segmentation: up to one hour.
- Historical trend recalculation: up to several hours.

## Best practice
- Compare similar time windows.
- Use at least a 7 day range for trend decisions.
- Track outliers before changing strategy.
`
    },
    {
        title: "Billing basics and invoice management",
        slug: "billing-basics-and-invoice-management",
        summary: "Review plans, invoices, payment methods, and recurring billing behavior.",
        category: "billing",
        tags: ["billing", "invoice", "payments"],
        featured: false,
        contentMarkdown: `# Billing basics and invoice management

Billing information is stored under workspace level settings.

## Plans and renewals
- Check your current plan and renewal date.
- Upgrade or downgrade before the next billing cycle.
- Confirm seat count before renewal to avoid surprise charges.

## Invoices
- Download invoices from billing history.
- Verify company legal name and tax details.
- Keep invoice email recipients up to date.

## Payment methods
- Add a backup card when possible.
- Replace expired cards before renewal.
- Contact support if a valid payment is declined.
`
    },
    {
        title: "Security checklist for teams and admins",
        slug: "security-checklist-for-teams-and-admins",
        summary: "Practical security controls for account hygiene, permissions, and incident response.",
        category: "security",
        tags: ["security", "permissions", "admin"],
        featured: true,
        contentMarkdown: `# Security checklist for teams and admins

Use this checklist as part of monthly workspace maintenance.

## Access controls
- Remove inactive members.
- Review admin roles and ownership changes.
- Use least privilege for project level access.

## Session safety
- Revoke unknown sessions immediately.
- Rotate passwords after suspected compromise.
- Audit access after offboarding team members.

## Incident response
- Capture screenshots and timestamps.
- Open a high priority support ticket.
- Include affected workspace, project, and user IDs when available.
`
    }
];

const DEFAULT_FAQS = [
    {
        id: "faq-account-1",
        category: "account",
        question: "How do I recover my account if I forgot my password?",
        answerMarkdown: "Use the reset password flow from login, then revoke unknown sessions once you regain access."
    },
    {
        id: "faq-privacy-1",
        category: "privacy",
        question: "Can I limit who sees my posts?",
        answerMarkdown: "Yes. Choose visibility per post: public, followers, or private."
    },
    {
        id: "faq-posts-1",
        category: "posts",
        question: "Why did my image upload fail?",
        answerMarkdown: "Check network stability, file type, and file size. Retry with a smaller image if needed."
    },
    {
        id: "faq-analytics-1",
        category: "analytics",
        question: "Why are analytics numbers delayed?",
        answerMarkdown: "Some advanced analytics refresh in batches. Core totals update faster than segmentation charts."
    },
    {
        id: "faq-billing-1",
        category: "billing",
        question: "Where can I download invoices?",
        answerMarkdown: "Invoices are available from billing history in workspace settings."
    },
    {
        id: "faq-security-1",
        category: "security",
        question: "What should I do after suspicious login activity?",
        answerMarkdown: "Change password immediately, revoke sessions, and open a high priority support ticket."
    },
    {
        id: "faq-posts-2",
        category: "posts",
        question: "Can I add screenshots to a support ticket?",
        answerMarkdown: "Yes. Tickets and replies support image attachments so support can review exact issues."
    },
    {
        id: "faq-account-2",
        category: "account",
        question: "Does the contact form create a support ticket?",
        answerMarkdown: "Yes. Every contact submission creates a trackable support ticket automatically."
    }
];

module.exports = {
    SUPPORT_CATEGORIES,
    CATEGORY_LABELS,
    TICKET_PRIORITIES,
    TICKET_STATUSES,
    FEEDBACK_TYPES,
    DEFAULT_HELP_ARTICLES,
    DEFAULT_FAQS
};
