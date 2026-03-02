/**
 * Production-ready image URLs using Unsplash /photos/:id endpoint (non-random)
 * These are curated images that won't change on each request
 */

export const productionImages = {
  // Carousel / Feature showcase images
  fairlens: {
    id: 'fairlens',
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Data visualization dashboard for FairLens feature',
  },
  explainboard: {
    id: 'explainboard',
    url: 'https://images.unsplash.com/photo-1631897713948-b0e0d8f2277f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Abstract network graph for ExplainBoard feature',
  },
  compliance: {
    id: 'compliance',
    url: 'https://images.unsplash.com/photo-1554821552-7acbed8a0f3b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Document and compliance reporting image',
  },

  // Auth / Generic
  authDecoration: 'https://images.unsplash.com/photo-1563206767-5ac1b757947f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=1080',
  avatarPlaceholder: 'https://images.unsplash.com/photo-1534528741775-53994a69be16?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=200',

  // Use as fallback for dynamic content
  fallback: 'https://images.unsplash.com/photo-1552664730-d307ca884978?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=1080',
};

export default productionImages;
