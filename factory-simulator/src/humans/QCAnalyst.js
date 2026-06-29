/**
 * QCAnalyst.js — Human Agent: Quality Control Analyst
 * Simulates QC sample submission, offline testing, result review, and usage decisions.
 */

export class QCAnalyst {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.operatorId = 'QC-001';
    this.name = 'Dr. L. Chen';
    this.role = 'QC Analyst';

    // Test methods for Zoladex
    this.testMethods = [
      { methodId: 'TM-DISS', name: 'Dissolution Profile', specs: [{ parameter: 'release_1hr', min: 8, max: 15, unit: '%' }] },
      { methodId: 'TM-ASSAY', name: 'Goserelin Assay', specs: [{ parameter: 'potency', min: 90, max: 110, unit: '%' }] },
      { methodId: 'TM-PSIZE', name: 'Particle Size Analysis', specs: [{ parameter: 'd50', min: 0.8, max: 1.5, unit: 'mm' }] },
      { methodId: 'TM-STER', name: 'Sterility Test', specs: [{ parameter: 'cfu', min: 0, max: 0, unit: 'CFU' }] },
      { methodId: 'TM-MOIST', name: 'Moisture Content (KF)', specs: [{ parameter: 'moisture', min: 0, max: 2.5, unit: '%w/w' }] },
    ];

    this.sampleCounter = 0;
    this.pendingSamples = [];
    this.reviewDelay = 60 * 60; // 60 min default review time
  }

  /**
   * Submit a batch sample for QC testing.
   */
  submitSample(batch, simTime) {
    this.sampleCounter++;
    const sampleId = `SMP-${batch.batchId}-${String(this.sampleCounter).padStart(3, '0')}`;

    // Run all test methods — results derived from batch properties (zero mock)
    const testResults = this.testMethods.map(method => {
      const result = this._executeTest(method, batch);
      return {
        methodId: method.methodId,
        methodName: method.name,
        values: result.values,
        passOrFail: result.pass ? 'Pass' : 'Fail',
        executedAt: simTime,
      };
    });

    const sample = {
      sampleId,
      batchId: batch.batchId,
      sampleType: 'Finished',
      collectionTime: simTime,
      operatorId: this.operatorId,
      testResults,
      allPassed: testResults.every(r => r.passOrFail === 'Pass'),
    };

    this.eventBus.emit('LIMS_SAMPLE_SUBMITTED', {
      simTime,
      sample,
    });

    // Schedule result review after delay
    this.pendingSamples.push({
      sample,
      reviewAt: simTime + this.reviewDelay * this._logNormalFactor(0, 0.3),
    });

    return sample;
  }

  /**
   * Process pending sample reviews.
   */
  tick(dt, simTime) {
    const readyForReview = this.pendingSamples.filter(p => simTime >= p.reviewAt);
    for (const pending of readyForReview) {
      this._reviewSample(pending.sample, simTime);
    }
    this.pendingSamples = this.pendingSamples.filter(p => simTime < p.reviewAt);
  }

  _reviewSample(sample, simTime) {
    const decision = sample.allPassed ? 'Released' : 'Quarantine';

    this.eventBus.emit('LIMS_RESULT_APPROVED', {
      simTime,
      sampleId: sample.sampleId,
      batchId: sample.batchId,
      analystId: this.operatorId,
      analystName: this.name,
      decision,
      approvalSignature: {
        operatorId: this.operatorId,
        hash: `SHA256:${this._generateHash()}`,
        timestamp: new Date(new Date('2026-06-29T06:00:00Z').getTime() + simTime * 1000).toISOString(),
      },
    });

    this.eventBus.emit('USAGE_DECISION', {
      simTime,
      batchId: sample.batchId,
      decision,
      rationale: sample.allPassed ? 'All QC tests passed within specification' : 'One or more QC tests out of specification',
      decisionMaker: this.operatorId,
    });

    this.eventBus.emit('HUMAN_ACTION', {
      simTime,
      role: 'QCAnalyst',
      action: `Usage Decision: ${decision}`,
      details: {
        batchId: sample.batchId,
        testsRun: sample.testResults.length,
        testsPassed: sample.testResults.filter(r => r.passOrFail === 'Pass').length,
      },
    });
  }

  _executeTest(method, batch) {
    switch (method.methodId) {
      case 'TM-ASSAY': {
        // Potency derived from batch apiPotency — the causal chain!
        const value = batch.apiPotency + (Math.random() - 0.5) * 2;
        return {
          values: [{ parameter: 'potency', value: parseFloat(value.toFixed(1)), unit: '%' }],
          pass: value >= method.specs[0].min && value <= method.specs[0].max,
        };
      }
      case 'TM-DISS': {
        const release = 12 + (Math.random() - 0.5) * 4;
        return {
          values: [{ parameter: 'release_1hr', value: parseFloat(release.toFixed(1)), unit: '%' }],
          pass: release >= method.specs[0].min && release <= method.specs[0].max,
        };
      }
      case 'TM-PSIZE': {
        const d50 = batch.strandDiameter > 0 ? batch.strandDiameter * 0.7 : 1.1;
        return {
          values: [{ parameter: 'd50', value: parseFloat(d50.toFixed(2)), unit: 'mm' }],
          pass: d50 >= method.specs[0].min && d50 <= method.specs[0].max,
        };
      }
      case 'TM-STER': {
        const cfu = 0; // Sterile product — should always be 0
        return {
          values: [{ parameter: 'cfu', value: cfu, unit: 'CFU' }],
          pass: cfu === 0,
        };
      }
      case 'TM-MOIST': {
        const moisture = batch.moistureContent;
        return {
          values: [{ parameter: 'moisture', value: parseFloat(moisture.toFixed(2)), unit: '%w/w' }],
          pass: moisture >= method.specs[0].min && moisture <= method.specs[0].max,
        };
      }
      default:
        return { values: [], pass: true };
    }
  }

  _logNormalFactor(mu = 0, sigma = 0.2) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.exp(mu + sigma * z);
  }

  _generateHash() {
    return Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }
}
