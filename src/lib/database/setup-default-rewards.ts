import { supabase } from '@/lib/supabase';

/**
 * Setup default rewards for a workspace - for testing purposes
 */
export async function setupDefaultRewards(workspaceId: string) {
  try {
    console.log('Setting up default rewards for workspace:', workspaceId);

    const defaultRewards = [
      // Learning & Development (Most promoted - Lowest cost)
      {
        workspace_id: workspaceId,
        title: 'Professional Development Book',
        description: 'Up to $30 reimbursement for career growth books',
        price: 150,
        category: 'Learning',
        image_url: '/rewards/book-allowance.jpg',
        active: true
      },
      {
        workspace_id: workspaceId,
        title: 'Online Course Credit',
        description: '$50 credit for Udemy, Coursera, LinkedIn Learning, or similar platforms',
        price: 200,
        category: 'Learning',
        image_url: '/rewards/online-course.jpg',
        active: true
      },
      {
        workspace_id: workspaceId,
        title: 'Skill Workshop Access',
        description: 'Access to premium workshops or webinars up to $75',
        price: 250,
        category: 'Learning',
        image_url: '/rewards/workshop.jpg',
        active: true
      },
      {
        workspace_id: workspaceId,
        title: 'Premium Course Bundle',
        description: 'Up to $200 for comprehensive online courses or certifications',
        price: 400,
        category: 'Learning',
        image_url: '/rewards/premium-course.jpg',
        active: true
      },
      {
        workspace_id: workspaceId,
        title: 'Paid Lunch & Learn Session',
        description: 'Lunch meeting with team lead or mentor for career guidance',
        price: 180,
        category: 'Learning',
        image_url: '/rewards/lunch-learn.jpg',
        active: true
      },
      {
        workspace_id: workspaceId,
        title: 'Conference Attendance',
        description: 'Ticket to relevant industry conference or professional event',
        price: 800,
        category: 'Learning',
        image_url: '/rewards/conference-ticket.jpg',
        active: true
      },
      
      // Time Off (Higher cost to balance usage)
      {
        workspace_id: workspaceId,
        title: 'Work From Home Day',
        description: 'One flexible remote work day',
        price: 300,
        category: 'Time Off',
        image_url: '/rewards/wfh-day.jpg',
        active: true
      },
      {
        workspace_id: workspaceId,
        title: 'Half Day Leave',
        description: 'Half day paid time off (4 hours)',
        price: 600,
        category: 'Time Off',
        image_url: '/rewards/half-day.jpg',
        active: true
      },
      {
        workspace_id: workspaceId,
        title: 'Full Day Leave',
        description: 'One full day of paid time off',
        price: 1000,
        category: 'Time Off',
        image_url: '/rewards/pto-day.jpg',
        active: true
      },
      {
        workspace_id: workspaceId,
        title: 'Extended Lunch Break',
        description: 'Take an extra hour for lunch (2-hour lunch break)',
        price: 120,
        category: 'Time Off',
        image_url: '/rewards/long-lunch.jpg',
        active: true
      },
      {
        workspace_id: workspaceId,
        title: 'Late Start Day',
        description: 'Start work 2 hours later than usual',
        price: 200,
        category: 'Time Off',
        image_url: '/rewards/late-start.jpg',
        active: true
      },
      {
        workspace_id: workspaceId,
        title: 'Early Finish Day',
        description: 'Leave work 2 hours early',
        price: 220,
        category: 'Time Off',
        image_url: '/rewards/early-finish.jpg',
        active: true
      },
      
      // Personal & Team Growth
      {
        workspace_id: workspaceId,
        title: 'Leadership Coffee Chat',
        description: 'One-on-one mentoring session with senior leadership',
        price: 350,
        category: 'Growth',
        image_url: '/rewards/leadership-chat.jpg',
        active: true
      },
      {
        workspace_id: workspaceId,
        title: 'Cross-Department Shadow',
        description: 'Half-day shadowing experience in different department',
        price: 400,
        category: 'Growth',
        image_url: '/rewards/shadow-experience.jpg',
        active: true
      },
      {
        workspace_id: workspaceId,
        title: 'Team Building Budget',
        description: 'Lead a team activity with $100 budget (pizza, games, etc.)',
        price: 500,
        category: 'Growth',
        image_url: '/rewards/team-building.jpg',
        active: true
      },
      {
        workspace_id: workspaceId,
        title: 'Skill Sharing Session',
        description: 'Host a knowledge-sharing session and get recognition',
        price: 300,
        category: 'Growth',
        image_url: '/rewards/skill-share.jpg',
        active: true
      },
      {
        workspace_id: workspaceId,
        title: 'Innovation Time',
        description: '4 hours of dedicated time to work on a passion project',
        price: 450,
        category: 'Growth',
        image_url: '/rewards/innovation-time.jpg',
        active: true
      },
      
      // Wellness & Recognition
      {
        workspace_id: workspaceId,
        title: 'Wellness Stipend',
        description: '$50 towards gym membership, fitness class, or wellness activity',
        price: 250,
        category: 'Wellness',
        image_url: '/rewards/wellness.jpg',
        active: true
      },
      {
        workspace_id: workspaceId,
        title: 'Employee Spotlight',
        description: 'Feature in company newsletter and social media',
        price: 200,
        category: 'Recognition',
        image_url: '/rewards/employee-spotlight.jpg',
        active: true
      },
      {
        workspace_id: workspaceId,
        title: 'Premium Coffee/Tea Supply',
        description: 'Your favorite premium coffee or tea stocked for a month',
        price: 180,
        category: 'Office Perks',
        image_url: '/rewards/premium-coffee.jpg',
        active: true
      }
    ];

    const { data, error } = await supabase
      .from('rewards')
      .insert(defaultRewards)
      .select();

    if (error) {
      console.error('Error creating default rewards:', error);
      throw error;
    }

    console.log('Successfully created default rewards:', data);
    return data;
  } catch (err) {
    console.error('Error in setupDefaultRewards:', err);
    throw err;
  }
}