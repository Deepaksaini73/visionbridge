import React, { useEffect } from 'react';
import { TumblingEDirection } from '../types/screening';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, HelpCircle } from 'lucide-react';

interface DirectionalResponseProps {
  mode: 'DIRECTIONAL';
  onSelectDirection: (direction: TumblingEDirection) => void;
  onUnsure?: () => void;
  disabled?: boolean;
}

interface NumericResponseProps {
  mode: 'NUMERIC';
  onSelectDigit: (digit: string) => void;
  onNothingVisible?: () => void;
  disabled?: boolean;
}

interface MultipleChoiceProps {
  mode: 'CHOICE';
  choices: string[];
  onSelectChoice: (choice: string) => void;
  onUnsure?: () => void;
  disabled?: boolean;
}

type TestResponseProps = DirectionalResponseProps | NumericResponseProps | MultipleChoiceProps;

export const TestResponse: React.FC<TestResponseProps> = (props) => {
  // Global keyboard listeners for arrow keys in directional mode
  useEffect(() => {
    if (props.mode !== 'DIRECTIONAL' || props.disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        props.onSelectDirection('UP');
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        props.onSelectDirection('DOWN');
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        props.onSelectDirection('LEFT');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        props.onSelectDirection('RIGHT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [props]);

  if (props.mode === 'DIRECTIONAL') {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Operator Response Pad (or Use Keyboard Arrow Keys)
        </div>

        {/* Cross Keypad Layout */}
        <div className="grid grid-cols-3 gap-2 max-w-[280px] w-full">
          <div />
          <button
            type="button"
            disabled={props.disabled}
            onClick={() => props.onSelectDirection('UP')}
            className="h-16 rounded-xl bg-white border-2 border-slate-300 hover:border-teal-500 hover:bg-teal-50 active:scale-95 shadow-sm font-bold text-slate-800 flex flex-col items-center justify-center transition-all disabled:opacity-50"
          >
            <ArrowUp className="w-6 h-6 text-teal-700" />
            <span className="text-[10px] text-slate-500 mt-0.5">UP (ऊपर)</span>
          </button>
          <div />

          <button
            type="button"
            disabled={props.disabled}
            onClick={() => props.onSelectDirection('LEFT')}
            className="h-16 rounded-xl bg-white border-2 border-slate-300 hover:border-teal-500 hover:bg-teal-50 active:scale-95 shadow-sm font-bold text-slate-800 flex flex-col items-center justify-center transition-all disabled:opacity-50"
          >
            <ArrowLeft className="w-6 h-6 text-teal-700" />
            <span className="text-[10px] text-slate-500 mt-0.5">LEFT (बाएँ)</span>
          </button>

          <div className="h-16 flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-slate-300" />
          </div>

          <button
            type="button"
            disabled={props.disabled}
            onClick={() => props.onSelectDirection('RIGHT')}
            className="h-16 rounded-xl bg-white border-2 border-slate-300 hover:border-teal-500 hover:bg-teal-50 active:scale-95 shadow-sm font-bold text-slate-800 flex flex-col items-center justify-center transition-all disabled:opacity-50"
          >
            <ArrowRight className="w-6 h-6 text-teal-700" />
            <span className="text-[10px] text-slate-500 mt-0.5">RIGHT (दाएँ)</span>
          </button>

          <div />
          <button
            type="button"
            disabled={props.disabled}
            onClick={() => props.onSelectDirection('DOWN')}
            className="h-16 rounded-xl bg-white border-2 border-slate-300 hover:border-teal-500 hover:bg-teal-50 active:scale-95 shadow-sm font-bold text-slate-800 flex flex-col items-center justify-center transition-all disabled:opacity-50"
          >
            <ArrowDown className="w-6 h-6 text-teal-700" />
            <span className="text-[10px] text-slate-500 mt-0.5">DOWN (नीचे)</span>
          </button>
          <div />
        </div>

        {props.onUnsure && (
          <button
            type="button"
            disabled={props.disabled}
            onClick={props.onUnsure}
            className="mt-4 px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center space-x-1.5 transition-all"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Customer Cannot See / Not Sure (दिखाई नहीं दे रहा)</span>
          </button>
        )}
      </div>
    );
  }

  if (props.mode === 'NUMERIC') {
    const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '12'];

    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Select Numeral Seen in Plate
        </div>

        <div className="grid grid-cols-5 gap-2 max-w-sm w-full">
          {digits.map((d) => (
            <button
              key={d}
              type="button"
              disabled={props.disabled}
              onClick={() => props.onSelectDigit(d)}
              className="h-12 rounded-lg bg-white border-2 border-slate-300 hover:border-teal-500 hover:bg-teal-50 font-bold text-lg text-slate-800 flex items-center justify-center shadow-sm active:scale-95 transition-all"
            >
              {d}
            </button>
          ))}
        </div>

        {props.onNothingVisible && (
          <button
            type="button"
            disabled={props.disabled}
            onClick={props.onNothingVisible}
            className="mt-3 w-full max-w-sm py-2.5 px-4 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all text-center"
          >
            Nothing Visible / No Number (कुछ नहीं दिखाई दे रहा)
          </button>
        )}
      </div>
    );
  }

  if (props.mode === 'CHOICE') {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Select Optotype Identified
        </div>

        <div className="flex flex-wrap justify-center gap-3 max-w-md w-full">
          {props.choices.map((c) => (
            <button
              key={c}
              type="button"
              disabled={props.disabled}
              onClick={() => props.onSelectChoice(c)}
              className="w-16 h-16 rounded-xl bg-white border-2 border-slate-300 hover:border-teal-500 hover:bg-teal-50 font-bold text-2xl text-slate-800 flex items-center justify-center shadow-sm active:scale-95 transition-all"
            >
              {c}
            </button>
          ))}
        </div>

        {props.onUnsure && (
          <button
            type="button"
            disabled={props.disabled}
            onClick={props.onUnsure}
            className="mt-3 px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center space-x-1.5 transition-all"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Cannot Read (पहचान में नहीं आ रहा)</span>
          </button>
        )}
      </div>
    );
  }

  return null;
};

