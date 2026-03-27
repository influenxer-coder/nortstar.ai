// NorthStar Experiment Flag
// Add this to your app to control who sees the experiment.
//
// Option 1: Async check (recommended)
async function checkNorthStarFlag(userEmail, userId) {
  try {
    const res = await fetch(
      'https://www.agent-northstar.com/api/flags/northstar-exp-launch-a-zero-expertise-ai-onboarding-fl-f5015z?email=' + encodeURIComponent(userEmail) + '&user_id=' + encodeURIComponent(userId || '')
    );
    const data = await res.json();
    return data.enabled === true;
  } catch {
    return false; // fail closed
  }
}

// Option 2: React hook
// import { useState, useEffect } from 'react';
//
// function useNorthStarFlag(userEmail, userId) {
//   const [enabled, setEnabled] = useState(false);
//   useEffect(() => {
//     checkNorthStarFlag(userEmail, userId).then(setEnabled);
//   }, [userEmail, userId]);
//   return enabled;
// }
//
// Usage in component:
// const showExperiment = useNorthStarFlag(user.email, user.id);
// if (showExperiment) {
//   return <NewExperience />;
// }
// return <CurrentExperience />;
