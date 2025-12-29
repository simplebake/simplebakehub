import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting daily performance goals data collection...')

    // Fetch all active performance goals
    const { data: goals, error: goalsError } = await supabase
      .from('performance_goals')
      .select('*')
      .eq('is_active', true)

    if (goalsError) {
      console.error('Error fetching goals:', goalsError)
      throw goalsError
    }

    console.log(`Found ${goals?.length || 0} active goals to update`)

    const results = []

    for (const goal of goals || []) {
      let currentValue = goal.current_value || 0

      try {
        switch (goal.goal_type) {
          case 'total_bakes': {
            const { count } = await supabase
              .from('baking_sessions')
              .select('*', { count: 'exact', head: true })
              .not('completed_at', 'is', null)
            currentValue = count || 0
            break
          }
          case 'average_rating': {
            const { data: sessions } = await supabase
              .from('baking_sessions')
              .select('success_rating')
              .not('success_rating', 'is', null)
            if (sessions && sessions.length > 0) {
              const avg = sessions.reduce((sum, s) => sum + s.success_rating, 0) / sessions.length
              currentValue = Math.round(avg * 10) / 10
            }
            break
          }
          case 'active_users': {
            const { count } = await supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
            currentValue = count || 0
            break
          }
          case 'tutorials_count': {
            const { count } = await supabase
              .from('tutorials')
              .select('*', { count: 'exact', head: true })
            currentValue = count || 0
            break
          }
          case 'premixes_count': {
            const { count } = await supabase
              .from('premixes')
              .select('*', { count: 'exact', head: true })
            currentValue = count || 0
            break
          }
          case 'customer_satisfaction': {
            const { data: sessions } = await supabase
              .from('baking_sessions')
              .select('success_rating')
              .not('success_rating', 'is', null)
              .gte('success_rating', 4)
            const { count: totalSessions } = await supabase
              .from('baking_sessions')
              .select('*', { count: 'exact', head: true })
              .not('success_rating', 'is', null)
            if (totalSessions && totalSessions > 0) {
              currentValue = Math.round(((sessions?.length || 0) / totalSessions) * 100)
            }
            break
          }
          case 'conversion_rate': {
            const { count: totalUsers } = await supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
            const { count: activeUsers } = await supabase
              .from('baking_sessions')
              .select('user_id', { count: 'exact', head: true })
            if (totalUsers && totalUsers > 0) {
              currentValue = Math.round(((activeUsers || 0) / totalUsers) * 100)
            }
            break
          }
          case 'user_engagement': {
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            const { count } = await supabase
              .from('baking_sessions')
              .select('*', { count: 'exact', head: true })
              .gte('created_at', thirtyDaysAgo.toISOString())
            currentValue = count || 0
            break
          }
          case 'community_shares': {
            const { count } = await supabase
              .from('bake_shares')
              .select('*', { count: 'exact', head: true })
              .eq('is_visible', true)
            currentValue = count || 0
            break
          }
          case 'community_likes': {
            const { count } = await supabase
              .from('bake_likes')
              .select('*', { count: 'exact', head: true })
            currentValue = count || 0
            break
          }
          case 'retention_rate': {
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            const { data: recentUsers } = await supabase
              .from('baking_sessions')
              .select('user_id')
              .gte('created_at', sevenDaysAgo.toISOString())
            const { count: totalUsers } = await supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
            if (totalUsers && totalUsers > 0) {
              const uniqueRecentUsers = new Set(recentUsers?.map(u => u.user_id) || []).size
              currentValue = Math.round((uniqueRecentUsers / totalUsers) * 100)
            }
            break
          }
          default:
            console.log(`Unknown goal type: ${goal.goal_type}, skipping auto-collection`)
            continue
        }

        // Update the goal with the new current value
        const { error: updateError } = await supabase
          .from('performance_goals')
          .update({ current_value: currentValue, updated_at: new Date().toISOString() })
          .eq('id', goal.id)

        if (updateError) {
          console.error(`Error updating goal ${goal.id}:`, updateError)
          results.push({ id: goal.id, name: goal.goal_name, success: false, error: updateError.message })
        } else {
          console.log(`Updated goal "${goal.goal_name}": ${currentValue}`)
          results.push({ id: goal.id, name: goal.goal_name, success: true, value: currentValue })
        }
      } catch (err) {
        console.error(`Error processing goal ${goal.id}:`, err)
        results.push({ id: goal.id, name: goal.goal_name, success: false, error: String(err) })
      }
    }

    console.log('Daily performance goals collection completed')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Performance goals data collection completed',
        results,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in collect-performance-goals:', error)
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
