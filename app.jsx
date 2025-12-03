import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, Dumbbell, PersonStanding, ChevronLeft, Play, CheckCircle2, Circle, Settings, LayoutList, Clock, Camera, History, X, Minus, ChevronRight, Image as ImageIcon, TrendingUp, Calendar } from 'lucide-react';

// --- UI COMPONENTS ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "flex items-center justify-center px-4 py-3 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500",
    secondary: "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700",
    success: "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-500",
    danger: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20",
    ghost: "bg-transparent text-zinc-400 hover:text-white"
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Input = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-zinc-600"
    />
  </div>
);

// --- HELPERS ---
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const SimpleChart = ({ data, color = "#3b82f6", unit = "kg" }) => {
  if (!data || data.length < 2) return <div className="h-32 flex items-center justify-center text-zinc-600 text-sm">Nicht genug Daten für Diagramm</div>;

  const height = 100;
  const width = 300;
  const padding = 10;
  
  const values = data.map(d => d.value);
  const min = Math.min(...values) * 0.9;
  const max = Math.max(...values) * 1.1;
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
    const y = height - ((d.value - min) / range) * (height - 2 * padding) - padding;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 overflow-visible">
        {/* Grid lines (optional simple ones) */}
        <line x1="0" y1={padding} x2={width} y2={padding} stroke="#3f3f46" strokeDasharray="4" strokeWidth="0.5" />
        <line x1="0" y1={height-padding} x2={width} y2={height-padding} stroke="#3f3f46" strokeDasharray="4" strokeWidth="0.5" />
        
        {/* The Line */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Dots */}
        {data.map((d, i) => {
           const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
           const y = height - ((d.value - min) / range) * (height - 2 * padding) - padding;
           return (
             <g key={i} className="group">
               <circle cx={x} cy={y} r="4" fill="#18181b" stroke={color} strokeWidth="2" />
               {/* Tooltip-ish text always visible for first and last, or if small amount of data */}
               {(i === data.length - 1 || data.length <= 5) && (
                 <text x={x} y={y - 10} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                   {d.value}
                 </text>
               )}
               <text x={x} y={height + 15} textAnchor="middle" fill="#71717a" fontSize="8">
                 {new Date(d.date).toLocaleDateString([], {day: '2-digit', month: '2-digit'})}
               </text>
             </g>
           )
        })}
      </svg>
    </div>
  );
};

export default function App() {
  const [plans, setPlans] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeView, setActiveView] = useState('list'); // 'list', 'edit', 'active', 'summary', 'history', 'progress'
  const [currentPlan, setCurrentPlan] = useState(null);
  const [editingPlanId, setEditingPlanId] = useState(null);

  // Active Workout State
  const [workoutStartTime, setWorkoutStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [restTimer, setRestTimer] = useState({ active: false, timeLeft: 0, initial: 90 });
  
  // Refs for intervals
  const timerRef = useRef(null);
  const restIntervalRef = useRef(null);

  // Initial Load
  useEffect(() => {
    const savedPlans = localStorage.getItem('hybridFitPlans');
    const savedHistory = localStorage.getItem('hybridFitHistory');
    
    if (savedPlans) setPlans(JSON.parse(savedPlans));
    else {
      setPlans([
        {
          id: Date.now(),
          name: "Oberkörper Hybrid",
          exercises: [
            { id: 1, name: "Muscle Ups", type: "calisthenics", sets: "3", reps: "5", weight: "0" },
            { id: 2, name: "Bankdrücken", type: "weight", sets: "3", reps: "8", weight: "80" },
            { id: 3, name: "Dips", type: "calisthenics", sets: "3", reps: "12", weight: "10" }
          ]
        }
      ]);
    }

    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  // Persistence
  useEffect(() => { localStorage.setItem('hybridFitPlans', JSON.stringify(plans)); }, [plans]);
  useEffect(() => { localStorage.setItem('hybridFitHistory', JSON.stringify(history)); }, [history]);

  // Global Timer Logic
  useEffect(() => {
    if (activeView === 'active' && !timerRef.current) {
      setWorkoutStartTime(Date.now());
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else if (activeView !== 'active' && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => clearInterval(timerRef.current);
  }, [activeView]);

  // Rest Timer Logic
  useEffect(() => {
    if (restTimer.active && restTimer.timeLeft > 0) {
      restIntervalRef.current = setInterval(() => {
        setRestTimer(prev => {
          if (prev.timeLeft <= 1) {
            clearInterval(restIntervalRef.current);
            return { ...prev, active: false, timeLeft: 0 };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    } else {
      clearInterval(restIntervalRef.current);
    }
    return () => clearInterval(restIntervalRef.current);
  }, [restTimer.active]);


  // --- ACTIONS ---

  const createNewPlan = () => {
    const newPlan = { id: Date.now(), name: "", exercises: [] };
    setCurrentPlan(newPlan);
    setEditingPlanId(null);
    setActiveView('edit');
  };

  const editPlan = (plan) => {
    setCurrentPlan({ ...plan });
    setEditingPlanId(plan.id);
    setActiveView('edit');
  };

  const startWorkout = (plan) => {
    // Expand exercises into sets
    const activeExercises = plan.exercises.map(ex => {
      const numSets = parseInt(ex.sets) || 3;
      const setsData = Array.from({ length: numSets }).map((_, i) => ({
        id: Date.now() + Math.random(),
        setNumber: i + 1,
        reps: ex.reps,
        weight: ex.weight || '0',
        completed: false
      }));
      return { ...ex, setsData };
    });

    setCurrentPlan({ ...plan, exercises: activeExercises });
    setElapsedTime(0);
    setWorkoutStartTime(Date.now());
    setActiveView('active');
  };

  const finishWorkout = () => {
    setActiveView('summary');
  };

  const saveHistory = (imageUrl = null, bodyWeight = '') => {
    const completedSets = currentPlan.exercises.reduce((acc, ex) => 
      acc + ex.setsData.filter(s => s.completed).length, 0
    );
    const totalSets = currentPlan.exercises.reduce((acc, ex) => acc + ex.setsData.length, 0);

    const historyEntry = {
      id: Date.now(),
      date: new Date().toISOString(),
      planName: currentPlan.name,
      duration: elapsedTime,
      setsCompleted: `${completedSets}/${totalSets}`,
      image: imageUrl,
      bodyWeight: bodyWeight,
      // IMPORTANT: Speichere detaillierte Übungsdaten für Progress Charts
      exercises: currentPlan.exercises.map(ex => ({
        name: ex.name,
        type: ex.type,
        setsData: ex.setsData.filter(s => s.completed) // Nur erledigte Sätze speichern
      }))
    };

    setHistory([historyEntry, ...history]);
    setActiveView('list');
  };

  const deletePlan = (id) => {
    if (confirm("Plan wirklich löschen?")) setPlans(plans.filter(p => p.id !== id));
  };

  const saveCurrentPlan = () => {
    if (!currentPlan.name.trim()) return alert("Bitte gib dem Plan einen Namen.");
    if (editingPlanId) {
      setPlans(plans.map(p => p.id === editingPlanId ? currentPlan : p));
    } else {
      setPlans([...plans, { ...currentPlan, id: Date.now() }]);
    }
    setActiveView('list');
  };

  // --- VIEWS ---

  const ListView = () => (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dein Training</h1>
          <p className="text-zinc-400">Hybrid Calisthenics & Weights</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setActiveView('progress')} className="bg-zinc-800 p-3 rounded-full text-zinc-400 hover:text-blue-400 transition-colors border border-zinc-700">
            <TrendingUp size={24} />
            </button>
            <button onClick={() => setActiveView('history')} className="bg-zinc-800 p-3 rounded-full text-zinc-400 hover:text-white transition-colors border border-zinc-700">
            <History size={24} />
            </button>
        </div>
      </header>

      {plans.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-zinc-800 border-dashed">
          <p className="text-zinc-500 mb-4">Noch keine Pläne erstellt.</p>
          <Button onClick={createNewPlan}>Ersten Plan erstellen</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {plans.map(plan => (
            <div key={plan.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm active:scale-[0.99] transition-transform">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <div className="flex gap-2">
                  <button onClick={() => editPlan(plan)} className="p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-lg">
                    <Settings size={18} />
                  </button>
                  <button onClick={() => deletePlan(plan.id)} className="p-2 text-zinc-400 hover:text-red-400 bg-zinc-800 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20 whitespace-nowrap">
                  {plan.exercises.filter(e => e.type === 'calisthenics').length} Calisthenics
                </span>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 whitespace-nowrap">
                  {plan.exercises.filter(e => e.type === 'weight').length} Gewichte
                </span>
              </div>
              <Button onClick={() => startWorkout(plan)} className="w-full flex items-center justify-center gap-2">
                <Play size={18} fill="currentColor" /> Training starten
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="fixed bottom-6 right-6 left-6">
         <Button onClick={createNewPlan} className="w-full py-4 shadow-xl shadow-blue-900/20 text-lg">
            <Plus className="mr-2" /> Neuer Plan
         </Button>
      </div>
    </div>
  );

  const EditView = () => {
    const [newExercise, setNewExercise] = useState({ name: '', type: 'calisthenics', sets: '3', reps: '10', weight: '' });
    
    const addExercise = () => {
      if (!newExercise.name) return;
      setCurrentPlan({
        ...currentPlan,
        exercises: [...currentPlan.exercises, { ...newExercise, id: Date.now() }]
      });
      setNewExercise({ name: '', type: 'calisthenics', sets: '3', reps: '10', weight: '' });
    };

    const removeExercise = (id) => {
      setCurrentPlan({ ...currentPlan, exercises: currentPlan.exercises.filter(e => e.id !== id) });
    };

    return (
      <div className="space-y-6 pb-32">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setActiveView('list')} className="p-2 -ml-2 text-zinc-400 hover:text-white">
            <ChevronLeft size={28} />
          </button>
          <h2 className="text-2xl font-bold text-white">{editingPlanId ? 'Plan bearbeiten' : 'Neuer Plan'}</h2>
        </div>

        <Input label="Name des Plans" value={currentPlan.name} onChange={(v) => setCurrentPlan({...currentPlan, name: v})} placeholder="z.B. Push Day" />

        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <h3 className="text-zinc-400 font-medium uppercase text-xs tracking-wider">Übungen</h3>
            <span className="text-xs text-zinc-600">{currentPlan.exercises.length} Übungen</span>
          </div>
          {currentPlan.exercises.map((ex) => (
            <div key={ex.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex justify-between items-center group">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${ex.type === 'calisthenics' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                   {ex.type === 'calisthenics' ? <PersonStanding size={20} /> : <Dumbbell size={20} />}
                </div>
                <div>
                  <div className="font-semibold text-white">{ex.name}</div>
                  <div className="text-xs text-zinc-400">{ex.sets} x {ex.reps} {ex.weight && `• ${ex.weight}kg`}</div>
                </div>
              </div>
              <button onClick={() => removeExercise(ex.id)} className="text-zinc-600 hover:text-red-500 p-2"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>

        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-2xl p-5 space-y-4 mt-8">
          <h4 className="font-bold text-white flex items-center gap-2"><Plus size={18} className="text-blue-500" /> Übung hinzufügen</h4>
          <div className="grid grid-cols-2 gap-2 bg-zinc-900 p-1 rounded-xl">
            <button onClick={() => setNewExercise({...newExercise, type: 'calisthenics'})} className={`py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${newExercise.type === 'calisthenics' ? 'bg-zinc-800 text-blue-400 shadow-sm' : 'text-zinc-500'}`}><PersonStanding size={16} /> Calisthenics</button>
            <button onClick={() => setNewExercise({...newExercise, type: 'weight'})} className={`py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${newExercise.type === 'weight' ? 'bg-zinc-800 text-emerald-400 shadow-sm' : 'text-zinc-500'}`}><Dumbbell size={16} /> Gewichte</button>
          </div>
          <Input label="Name der Übung" value={newExercise.name} onChange={(v) => setNewExercise({...newExercise, name: v})} placeholder="z.B. Pull Ups" />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Sätze" value={newExercise.sets} onChange={(v) => setNewExercise({...newExercise, sets: v})} placeholder="3" />
            <Input label="Wdh" value={newExercise.reps} onChange={(v) => setNewExercise({...newExercise, reps: v})} placeholder="10" />
            <Input label="Gewicht (kg)" value={newExercise.weight} onChange={(v) => setNewExercise({...newExercise, weight: v})} placeholder="20" />
          </div>
          <Button onClick={addExercise} variant="secondary" className="w-full">Hinzufügen</Button>
        </div>
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800">
           <Button onClick={saveCurrentPlan} className="w-full">Plan Speichern</Button>
        </div>
      </div>
    );
  };

  const ActiveView = () => {
    const updateSet = (exerciseId, setId, field, value) => {
      setCurrentPlan({
        ...currentPlan,
        exercises: currentPlan.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;
          return {
            ...ex,
            setsData: ex.setsData.map(s => s.id === setId ? { ...s, [field]: value } : s)
          };
        })
      });
    };

    const toggleSetComplete = (exerciseId, setId) => {
      const ex = currentPlan.exercises.find(e => e.id === exerciseId);
      const set = ex.setsData.find(s => s.id === setId);
      updateSet(exerciseId, setId, 'completed', !set.completed);
    };

    const adjustValue = (exerciseId, setId, field, delta) => {
        const ex = currentPlan.exercises.find(e => e.id === exerciseId);
        const set = ex.setsData.find(s => s.id === setId);
        const currentVal = parseFloat(set[field]) || 0;
        const newVal = Math.max(0, currentVal + delta);
        updateSet(exerciseId, setId, field, newVal.toString());
    }

    const startRest = (duration) => {
      setRestTimer({ active: true, timeLeft: duration, initial: duration });
    };

    return (
      <div className="space-y-6 pb-32 h-full flex flex-col">
        {/* Header with Timer */}
        <div className="flex items-center justify-between sticky top-0 bg-zinc-950/95 backdrop-blur py-4 z-10 border-b border-zinc-800/50">
           <div className="flex items-center gap-3">
             <button onClick={() => { if(confirm("Training wirklich abbrechen?")) setActiveView('list'); }} className="p-2 -ml-2 text-zinc-400 hover:text-white"><X size={24} /></button>
             <h2 className="text-lg font-bold text-white truncate max-w-[150px]">{currentPlan.name}</h2>
           </div>
           <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
             <Clock size={16} className="text-blue-500" />
             <span className="font-mono font-medium text-white">{formatTime(elapsedTime)}</span>
           </div>
        </div>

        {/* Exercises List */}
        <div className="space-y-8">
          {currentPlan.exercises.map((ex) => (
            <div key={ex.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-3">
                 <div className={`p-2 rounded-lg ${ex.type === 'calisthenics' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {ex.type === 'calisthenics' ? <PersonStanding size={20} /> : <Dumbbell size={20} />}
                 </div>
                 <h3 className="text-xl font-bold text-white">{ex.name}</h3>
              </div>
              
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                 {/* Table Header */}
                 <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-2 px-4 py-2 bg-zinc-800/50 text-xs text-zinc-400 font-medium uppercase tracking-wider text-center">
                    <div className="w-8">Set</div>
                    <div>kg</div>
                    <div>Reps</div>
                    <div className="w-8">Check</div>
                    <div className="w-8">Pause</div>
                 </div>

                 {/* Sets Rows */}
                 {ex.setsData.map((set, idx) => (
                   <div key={set.id} className={`grid grid-cols-[auto_1fr_1fr_auto_auto] gap-2 p-3 items-center border-t border-zinc-800 ${set.completed ? 'bg-zinc-800/20' : ''}`}>
                      <div className="w-8 text-center font-mono text-zinc-500 text-sm">{idx + 1}</div>
                      
                      {/* Weight Control */}
                      <div className="flex items-center justify-center bg-zinc-950 rounded-lg border border-zinc-800 p-1">
                         <button onClick={() => adjustValue(ex.id, set.id, 'weight', -1.25)} className="p-1 text-zinc-500 active:text-white"><Minus size={14}/></button>
                         <input 
                           type="number" 
                           value={set.weight} 
                           onChange={(e) => updateSet(ex.id, set.id, 'weight', e.target.value)}
                           className="w-10 bg-transparent text-center text-white font-bold focus:outline-none [appearance:textfield]"
                         />
                         <button onClick={() => adjustValue(ex.id, set.id, 'weight', 1.25)} className="p-1 text-zinc-500 active:text-white"><Plus size={14}/></button>
                      </div>

                      {/* Reps Control */}
                      <div className="flex items-center justify-center bg-zinc-950 rounded-lg border border-zinc-800 p-1">
                         <button onClick={() => adjustValue(ex.id, set.id, 'reps', -1)} className="p-1 text-zinc-500 active:text-white"><Minus size={14}/></button>
                         <input 
                           type="number" 
                           value={set.reps} 
                           onChange={(e) => updateSet(ex.id, set.id, 'reps', e.target.value)}
                           className="w-10 bg-transparent text-center text-white font-bold focus:outline-none [appearance:textfield]"
                         />
                         <button onClick={() => adjustValue(ex.id, set.id, 'reps', 1)} className="p-1 text-zinc-500 active:text-white"><Plus size={14}/></button>
                      </div>

                      {/* Check Button */}
                      <div className="flex justify-center w-8">
                         <button onClick={() => toggleSetComplete(ex.id, set.id)} className={`transition-all active:scale-90 ${set.completed ? 'text-emerald-500' : 'text-zinc-600 hover:text-zinc-500'}`}>
                            {set.completed ? <CheckCircle2 size={28} className="fill-emerald-500/20" /> : <Circle size={28} />}
                         </button>
                      </div>

                      {/* Rest Timer Trigger */}
                      <div className="flex justify-center w-8">
                         <button onClick={() => startRest(90)} className="text-zinc-600 hover:text-blue-400 p-1 bg-zinc-800 rounded-md active:bg-blue-600 active:text-white transition-colors">
                            <Clock size={18} />
                         </button>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800 z-20">
           <Button onClick={finishWorkout} variant="success" className="w-full text-lg shadow-emerald-900/20">Training beenden</Button>
        </div>

        {/* REST TIMER OVERLAY */}
        {restTimer.active && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-3xl w-full max-w-xs text-center shadow-2xl">
                <h3 className="text-zinc-400 uppercase tracking-widest text-sm mb-4">Pause</h3>
                <div className="text-7xl font-mono font-bold text-white mb-8 tabular-nums tracking-tighter">
                   {formatTime(restTimer.timeLeft)}
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                   <button onClick={() => setRestTimer(prev => ({...prev, timeLeft: prev.timeLeft + 30}))} className="bg-zinc-800 text-white py-2 rounded-lg font-medium hover:bg-zinc-700">+30s</button>
                   <button onClick={() => setRestTimer(prev => ({...prev, timeLeft: prev.timeLeft - 10}))} className="bg-zinc-800 text-white py-2 rounded-lg font-medium hover:bg-zinc-700">-10s</button>
                   <button onClick={() => setRestTimer({...restTimer, active: false})} className="bg-zinc-800 text-red-400 py-2 rounded-lg font-medium hover:bg-red-900/20">Skip</button>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-500 transition-all duration-1000 ease-linear" style={{ width: `${(restTimer.timeLeft / restTimer.initial) * 100}%` }}></div>
                </div>
             </div>
          </div>
        )}
      </div>
    );
  };

  const SummaryView = () => {
    const [image, setImage] = useState(null);
    const [bodyWeight, setBodyWeight] = useState("");
    const completedSets = currentPlan.exercises.reduce((acc, ex) => acc + ex.setsData.filter(s => s.completed).length, 0);
    const totalSets = currentPlan.exercises.reduce((acc, ex) => acc + ex.setsData.length, 0);

    const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setImage(reader.result);
        reader.readAsDataURL(file);
      }
    };

    return (
       <div className="space-y-6 pb-20 text-center pt-10">
          <div className="inline-flex p-4 bg-emerald-500/10 rounded-full text-emerald-500 mb-2">
             <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-bold text-white">Training Beendet!</h2>
          <div className="grid grid-cols-2 gap-4 text-left">
             <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                <div className="text-zinc-500 text-xs uppercase font-bold">Dauer</div>
                <div className="text-2xl font-mono text-white">{formatTime(elapsedTime)}</div>
             </div>
             <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                <div className="text-zinc-500 text-xs uppercase font-bold">Sets</div>
                <div className="text-2xl font-mono text-white">{completedSets} / {totalSets}</div>
             </div>
          </div>
          
          <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 text-left space-y-2">
             <label className="text-zinc-500 text-xs uppercase font-bold">Körpergewicht heute (kg)</label>
             <input 
                type="number" 
                value={bodyWeight} 
                onChange={(e) => setBodyWeight(e.target.value)}
                placeholder="z.B. 82.5"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
             />
          </div>

          <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-2xl p-6 flex flex-col items-center gap-4">
             {image ? (
               <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black">
                  <img src={image} alt="Progress" className="w-full h-full object-cover" />
                  <button onClick={() => setImage(null)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"><X size={16}/></button>
               </div>
             ) : (
               <>
                 <div className="p-3 bg-zinc-800 rounded-full text-zinc-400"><Camera size={24} /></div>
                 <p className="text-zinc-400 text-sm">Progress Foto hinzufügen</p>
                 <label className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium cursor-pointer hover:bg-blue-500 transition-colors w-full">
                    Foto auswählen
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                 </label>
               </>
             )}
          </div>

          <Button onClick={() => saveHistory(image, bodyWeight)} className="w-full" variant="primary">Speichern & Beenden</Button>
       </div>
    );
  };

  const ProgressView = () => {
    const [selectedExercise, setSelectedExercise] = useState("");
    
    // Extract data for bodyweight
    const bodyWeightData = history
        .filter(h => h.bodyWeight)
        .map(h => ({ date: h.date, value: parseFloat(h.bodyWeight) }))
        .reverse();

    // Get unique exercise names from history
    const allExercises = Array.from(new Set(
        history.flatMap(h => h.exercises ? h.exercises.map(e => e.name) : [])
    )).sort();

    useEffect(() => {
        if (!selectedExercise && allExercises.length > 0) setSelectedExercise(allExercises[0]);
    }, [allExercises]);

    // Extract max weight data for selected exercise
    const exerciseData = selectedExercise ? history
        .filter(h => h.exercises)
        .map(h => {
            const ex = h.exercises.find(e => e.name === selectedExercise);
            if (!ex || !ex.setsData || ex.setsData.length === 0) return null;
            // Find max weight used in this session for this exercise
            const maxWeight = Math.max(...ex.setsData.map(s => parseFloat(s.weight) || 0));
            return { date: h.date, value: maxWeight };
        })
        .filter(d => d !== null && d.value > 0)
        .reverse() : [];

    return (
        <div className="space-y-6 pb-20">
             <div className="flex items-center gap-4 mb-4">
                <button onClick={() => setActiveView('list')} className="p-2 -ml-2 text-zinc-400 hover:text-white">
                    <ChevronLeft size={28} />
                </button>
                <h2 className="text-2xl font-bold text-white">Fortschritt</h2>
            </div>

            {/* Body Weight Chart */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <h3 className="text-zinc-400 uppercase text-xs font-bold tracking-wider mb-4">Körpergewicht</h3>
                <SimpleChart data={bodyWeightData} color="#10b981" unit="kg" />
            </div>

            {/* Exercise Chart */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-zinc-400 uppercase text-xs font-bold tracking-wider">Übung Max Kraft</h3>
                 </div>
                 
                 {allExercises.length > 0 ? (
                     <div className="mb-4">
                        <select 
                            value={selectedExercise} 
                            onChange={(e) => setSelectedExercise(e.target.value)}
                            className="w-full bg-zinc-800 text-white p-2 rounded-lg border border-zinc-700 focus:outline-none focus:border-blue-500"
                        >
                            {allExercises.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                     </div>
                 ) : <p className="text-zinc-500 text-sm mb-4">Keine Übungsdaten verfügbar</p>}

                 <SimpleChart data={exerciseData} color="#3b82f6" unit="kg" />
                 <p className="text-xs text-zinc-600 mt-2 text-center">Zeigt das höchste bewältigte Gewicht pro Training.</p>
            </div>
        </div>
    );
  };

  const HistoryView = () => (
    <div className="space-y-6">
       <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setActiveView('list')} className="p-2 -ml-2 text-zinc-400 hover:text-white">
            <ChevronLeft size={28} />
          </button>
          <h2 className="text-2xl font-bold text-white">Verlauf</h2>
       </div>
       {history.length === 0 ? <p className="text-zinc-500 text-center py-10">Noch keine Trainings absolviert.</p> : (
         <div className="space-y-4">
            {history.map(entry => (
               <div key={entry.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex gap-4">
                  {entry.image ? (
                     <img src={entry.image} className="w-16 h-16 rounded-lg object-cover bg-black" />
                  ) : (
                     <div className="w-16 h-16 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500"><ImageIcon size={20}/></div>
                  )}
                  <div className="flex-1">
                     <div className="flex justify-between items-start">
                        <div className="font-bold text-white">{entry.planName}</div>
                        {entry.bodyWeight && <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">{entry.bodyWeight}kg BW</span>}
                     </div>
                     <div className="text-xs text-zinc-400">{new Date(entry.date).toLocaleDateString()} • {new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} Uhr</div>
                     <div className="mt-2 flex gap-3 text-sm font-mono text-zinc-300">
                        <span className="flex items-center gap-1"><Clock size={12}/> {formatTime(entry.duration)}</span>
                        <span className="flex items-center gap-1"><CheckCircle2 size={12}/> {entry.setsCompleted}</span>
                     </div>
                  </div>
               </div>
            ))}
         </div>
       )}
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-500/30">
      <div className="max-w-md mx-auto min-h-screen flex flex-col p-6">
        {activeView === 'list' && <ListView />}
        {activeView === 'edit' && <EditView />}
        {activeView === 'active' && <ActiveView />}
        {activeView === 'summary' && <SummaryView />}
        {activeView === 'history' && <HistoryView />}
        {activeView === 'progress' && <ProgressView />}
      </div>
    </div>
  );
}