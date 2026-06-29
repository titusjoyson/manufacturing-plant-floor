/**
 * useSimulation.js — WebSocket hook for real-time simulator state.
 * Connects to the factory-simulator WS server and maintains state.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = 'ws://localhost:8080';

export function useSimulation() {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  // ── State ──
  const [connected, setConnected] = useState(false);
  const [campaign, setCampaign] = useState(null);
  const [equipment, setEquipment] = useState({});
  const [alarms, setAlarms] = useState([]);
  const [clock, setClock] = useState({ simTime: 0, timeScale: 50, running: false, paused: false });
  const [messages, setMessages] = useState([]);
  const [ebrSteps, setEbrSteps] = useState([]);
  const [humanActions, setHumanActions] = useState([]);
  const [materialBatch, setMaterialBatch] = useState(null);

  // ── WebSocket Connection ──
  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log('[WS] Connected to simulator');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleMessage(msg);
        } catch (err) {
          console.error('[WS] Parse error:', err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        console.log('[WS] Disconnected — reconnecting in 3s...');
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, []);

  // ── Message Handler ──
  function handleMessage(msg) {
    switch (msg.type) {
      case 'INITIAL_STATE':
        setCampaign(msg.data.campaign);
        setEquipment(msg.data.equipment);
        setAlarms(msg.data.alarms || []);
        setClock(msg.data.clock);
        break;

      case 'TELEMETRY_UPDATE':
        setEquipment(msg.data.equipment);
        setCampaign(msg.data.campaign);
        setClock(prev => ({
          ...prev,
          simTime: msg.data.simTime,
          formattedTime: msg.data.formattedTime,
          simDateTime: msg.data.simDateTime,
        }));
        break;

      case 'CAMPAIGN_STATUS':
        setCampaign(prev => ({ ...prev, ...msg.data }));
        break;

      case 'BATCH_STARTED':
      case 'BATCH_COMPLETED':
        setCampaign(prev => prev ? { ...prev, ...msg.data } : msg.data);
        break;

      case 'STAGE_STARTED':
      case 'STAGE_COMPLETED':
        setCampaign(prev => prev ? {
          ...prev,
          currentStage: msg.data.stageId,
          currentStageName: msg.data.stageName,
        } : prev);
        break;

      case 'ALARM_RAISED':
        setAlarms(prev => [...prev, msg.data.alarm]);
        break;

      case 'ALARM_CLEARED':
        setAlarms(prev => prev.filter(a => a.alarmId !== msg.data.alarm.alarmId));
        break;

      case 'ALARM_ACKNOWLEDGED':
        setAlarms(prev => prev.map(a =>
          a.alarmId === msg.data.alarm.alarmId ? { ...a, status: 'Acknowledged' } : a
        ));
        break;

      case 'MATERIAL_UPDATED':
        setMaterialBatch(msg.data.snapshot);
        break;

      case 'INTEGRATION_MSG':
        setMessages(prev => {
          const next = [...prev, msg.data];
          return next.length > 200 ? next.slice(-200) : next;
        });
        break;

      case 'EBR_STEP':
        setEbrSteps(prev => [...prev, msg.data.step]);
        break;

      case 'HUMAN_ACTION':
        setHumanActions(prev => {
          const next = [...prev, msg.data];
          return next.length > 100 ? next.slice(-100) : next;
        });
        break;

      case 'CLOCK_UPDATE':
        setClock(prev => ({ ...prev, ...msg.data }));
        break;

      case 'SPC_OUT_OF_CONTROL':
        // Add to alarms as an SPC alarm
        setAlarms(prev => [...prev, {
          alarmId: `SPC-${Date.now()}`,
          severity: 'Warning',
          description: `SPC ${msg.data.rule}: ${msg.data.direction} mean`,
          status: 'Raised',
        }]);
        break;
    }
  }

  // ── Commands ──
  const send = useCallback((type, data = {}) => {
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type, data }));
    }
  }, []);

  const startCampaign = useCallback(() => send('CMD_START_CAMPAIGN'), [send]);
  const pause = useCallback(() => send('CMD_PAUSE'), [send]);
  const resume = useCallback(() => send('CMD_RESUME'), [send]);
  const setSpeed = useCallback((speed) => send('CMD_SET_SPEED', { speed }), [send]);
  const injectFault = useCallback((faultId) => send('CMD_INJECT_FAULT', { faultId }), [send]);
  const acknowledgeAlarm = useCallback((alarmId) => send('CMD_ACKNOWLEDGE_ALARM', { alarmId }), [send]);

  return {
    connected,
    campaign,
    equipment,
    alarms,
    clock,
    messages,
    ebrSteps,
    humanActions,
    materialBatch,
    startCampaign,
    pause,
    resume,
    setSpeed,
    injectFault,
    acknowledgeAlarm,
  };
}
