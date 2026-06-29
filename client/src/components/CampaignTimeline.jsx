/**
 * CampaignTimeline.jsx — Visual stage progress timeline.
 */

import { STAGE_ORDER, STAGES } from '@shared/stages.js';

export default function CampaignTimeline({ campaign }) {
  const currentStageIndex = campaign?.currentStage
    ? STAGE_ORDER.indexOf(campaign.currentStage)
    : -1;

  return (
    <div className="stage-timeline">
      {STAGE_ORDER.map((stageId, i) => {
        const stage = STAGES[stageId];
        let className = 'stage-timeline__item stage-timeline__item--pending';
        if (i < currentStageIndex) className = 'stage-timeline__item stage-timeline__item--complete';
        if (i === currentStageIndex) className = 'stage-timeline__item stage-timeline__item--active';

        return (
          <div key={stageId} className={className} title={stage.name}>
            {stage.shortName}
          </div>
        );
      })}
    </div>
  );
}
