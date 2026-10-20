let activeJobs = 0;

export const isAiJobActive = () => activeJobs > 0;

export const runTrackedAiJob = async (job) => {
    activeJobs += 1;
    try {
        return await job();
    } finally {
        activeJobs -= 1;
    }
};

export const tryRunTrackedAiJob = async (job) => {
    if (isAiJobActive()) return { started: false, result: undefined };
    return { started: true, result: await runTrackedAiJob(job) };
};
