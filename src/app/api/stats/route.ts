import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Estadísticas del dashboard
export async function GET() {
  try {
    // Get counts
    const [
      totalConversations,
      activeConversations,
      totalLeads,
      newLeads,
      interestedLeads,
      qualifiedLeads,
      customerLeads,
      totalMessages,
      todayMessages,
      activeFlows,
      knowledgeItems
    ] = await Promise.all([
      db.conversation.count(),
      db.conversation.count({ where: { status: 'active' } }),
      db.lead.count(),
      db.lead.count({ where: { stage: 'awareness' } }),
      db.lead.count({ where: { stage: 'consideration' } }),
      db.lead.count({ where: { stage: 'decision' } }),
      db.lead.count({ where: { stage: 'purchase' } }),
      db.message.count(),
      db.message.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      db.flow.count({ where: { isActive: true } }),
      db.knowledgeBase.count({ where: { isActive: true } })
    ]);

    // Get conversations by platform
    const conversationsByPlatform = await db.conversation.groupBy({
      by: ['platform'],
      _count: true
    });

    // Get recent conversations
    const recentConversations = await db.conversation.findMany({
      take: 10,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        lead: { select: { name: true, score: true } }
      }
    });

    // Get top leads by score
    const topLeads = await db.lead.findMany({
      take: 5,
      orderBy: { score: 'desc' },
      include: {
        conversation: { select: { platform: true } }
      }
    });

    // Messages in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const messagesLast7Days = await db.message.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: sevenDaysAgo }
      },
      _count: true
    });

    // Group by day
    const messagesByDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      messagesByDay[key] = 0;
    }

    for (const msg of messagesLast7Days) {
      const key = new Date(msg.createdAt).toISOString().split('T')[0];
      if (messagesByDay[key] !== undefined) {
        messagesByDay[key] += msg._count;
      }
    }

    // Calculate conversion rate
    const conversionRate = totalLeads > 0 
      ? Math.round((customerLeads / totalLeads) * 100) 
      : 0;

    return NextResponse.json({
      overview: {
        totalConversations,
        activeConversations,
        totalLeads,
        totalMessages,
        todayMessages,
        activeFlows,
        knowledgeItems,
        conversionRate
      },
      leadsByStage: {
        new: newLeads,
        interested: interestedLeads,
        qualified: qualifiedLeads,
        customer: customerLeads
      },
      conversationsByPlatform: conversationsByPlatform.reduce((acc, curr) => {
        acc[curr.platform] = curr._count;
        return acc;
      }, {} as Record<string, number>),
      recentConversations,
      topLeads,
      messagesByDay: Object.entries(messagesByDay).map(([date, count]) => ({
        date,
        count
      }))
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
