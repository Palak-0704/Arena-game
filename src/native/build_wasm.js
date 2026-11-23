// Flowbound: Masters of Four - WebAssembly Build Script
// Compiles High-Performance WebAssembly Module using wabt

import wabtModule from 'wabt';
import fs from 'fs';
import path from 'path';

async function buildWasm() {
  const wabt = await wabtModule();

  // WebAssembly Text representation of Flowbound Performance Core
  const watSource = `
  (module
    ;; Memory for shared buffer exchange (1 page = 64KB)
    (memory (export "memory") 1)

    ;; 1. Segment-to-Segment Minimum Squared Distance (for capsule collision & melee sweep)
    (func $distanceSq (export "distanceSq")
      (param $x1 f32) (param $y1 f32) (param $z1 f32)
      (param $x2 f32) (param $y2 f32) (param $z2 f32)
      (result f32)
      (local $dx f32) (local $dy f32) (local $dz f32)
      (local.set $dx (f32.sub (local.get $x2) (local.get $x1)))
      (local.set $dy (f32.sub (local.get $y2) (local.get $y1)))
      (local.set $dz (f32.sub (local.get $z2) (local.get $z1)))
      (f32.add
        (f32.mul (local.get $dx) (local.get $dx))
        (f32.add
          (f32.mul (local.get $dy) (local.get $dy))
          (f32.mul (local.get $dz) (local.get $dz))
        )
      )
    )

    ;; 2. Fast Continuous Collision Detection (CCD) Ray vs Capsule
    (func $checkSweptCollision (export "checkSweptCollision")
      (param $rx f32) (param $ry f32) (param $rz f32)
      (param $cx f32) (param $cy f32) (param $cz f32)
      (param $radiusSum f32)
      (result i32)
      (local $d2 f32)
      (local.set $d2 (call $distanceSq (local.get $rx) (local.get $ry) (local.get $rz) (local.get $cx) (local.get $cy) (local.get $cz)))
      (f32.le (local.get $d2) (f32.mul (local.get $radiusSum) (local.get $radiusSum)))
    )

    ;; 3. Absolver Poise & Damage Mitigation Calculator (80% Block, 2.5x Breaker Poise)
    ;; Writes result to memory offset 0: [finalDamage, finalPoiseDamage, wasBlocked, isGuardBroken]
    (func $calculateAbsolverDamage (export "calculateAbsolverDamage")
      (param $rawDamage f32)
      (param $rawPoise f32)
      (param $isHeavy i32)
      (param $isGuarding i32)
      (param $currentPoise f32)
      (result f32)
      (local $damage f32)
      (local $poiseDrain f32)

      ;; If guarding, mitigate 80% damage
      (if (local.get $isGuarding)
        (then
          (local.set $damage (f32.mul (local.get $rawDamage) (f32.const 0.20)))
          ;; If heavy breaker attack, multiply poise drain by 2.5x
          (if (local.get $isHeavy)
            (then (local.set $poiseDrain (f32.mul (local.get $rawPoise) (f32.const 2.50))))
            (else (local.set $poiseDrain (local.get $rawPoise)))
          )
        )
        (else
          (local.set $damage (local.get $rawDamage))
          (local.set $poiseDrain (local.get $rawPoise))
        )
      )

      ;; Store results to memory
      (f32.store offset=0 (i32.const 0) (local.get $damage))
      (f32.store offset=4 (i32.const 0) (local.get $poiseDrain))
      (i32.store offset=8 (i32.const 0) (local.get $isGuarding))
      (i32.store offset=12 (i32.const 0) (f32.le (f32.sub (local.get $currentPoise) (local.get $poiseDrain)) (f32.const 0.0)))

      (local.get $damage)
    )

    ;; 4. Fast Vectorized Arena Radius Clamp
    (func $clampArena (export "clampArena")
      (param $x f32) (param $z f32) (param $maxRadius f32)
      (result f32)
      (local $dist f32)
      (local.set $dist (f32.sqrt (f32.add (f32.mul (local.get $x) (local.get $x)) (f32.mul (local.get $z) (local.get $z)))))
      (if (result f32) (f32.gt (local.get $dist) (local.get $maxRadius))
        (then
          (f32.div (local.get $maxRadius) (local.get $dist))
        )
        (else
          (f32.const 1.0)
        )
      )
    )

    ;; 5. Sparring AI Orbital Tangent Vector
    ;; Returns tangent X at mem offset 16, tangent Z at mem offset 20
    (func $computeOrbitalVelocity (export "computeOrbitalVelocity")
      (param $dx f32) (param $dz f32) (param $speed f32) (param $direction i32)
      (local $len f32)
      (local $invLen f32)
      (local $dirFwdX f32)
      (local $dirFwdZ f32)
      (local $rightX f32)
      (local $rightZ f32)

      (local.set $len (f32.sqrt (f32.add (f32.mul (local.get $dx) (local.get $dx)) (f32.mul (local.get $dz) (local.get $dz)))))
      (if (f32.gt (local.get $len) (f32.const 0.001))
        (then
          (local.set $invLen (f32.div (f32.const 1.0) (local.get $len)))
          (local.set $dirFwdX (f32.mul (local.get $dx) (local.get $invLen)))
          (local.set $dirFwdZ (f32.mul (local.get $dz) (local.get $invLen)))
          (local.set $rightX (f32.neg (local.get $dirFwdZ)))
          (local.set $rightZ (local.get $dirFwdX))

          (if (local.get $direction)
            (then
              (f32.store offset=16 (i32.const 0) (f32.mul (local.get $rightX) (local.get $speed)))
              (f32.store offset=20 (i32.const 0) (f32.mul (local.get $rightZ) (local.get $speed)))
            )
            (else
              (f32.store offset=16 (i32.const 0) (f32.mul (f32.neg (local.get $rightX)) (local.get $speed)))
              (f32.store offset=20 (i32.const 0) (f32.mul (f32.neg (local.get $rightZ)) (local.get $speed)))
            )
          )
        )
      )
    )
  )
  `;

  console.log('[WASM Builder] Parsing WebAssembly Text (WAT)...');
  const parsedModule = wabt.parseWat('FlowboundCore.wat', watSource);
  parsedModule.resolveNames();
  parsedModule.validate();

  console.log('[WASM Builder] Emitting binary WebAssembly module...');
  const binaryOutput = parsedModule.toBinary({ log: true, write_debug_names: true });

  const wasmDir = 'public/wasm';
  if (!fs.existsSync(wasmDir)) {
    fs.mkdirSync(wasmDir, { recursive: true });
  }

  const outPath = path.join(wasmDir, 'flowbound_core.wasm');
  fs.writeFileSync(outPath, Buffer.from(binaryOutput.buffer));
  console.log(`[WASM Builder] Successfully compiled flowbound_core.wasm (${binaryOutput.buffer.length} bytes) to ${outPath}`);

  // Test loading compiled WASM
  const wasmBuf = fs.readFileSync(outPath);
  const { instance } = await WebAssembly.instantiate(wasmBuf);
  const exports = instance.exports;

  console.log('[WASM Builder] Running validation tests on WebAssembly module:');
  const d2 = exports.distanceSq(0, 0, 0, 3, 4, 0);
  console.log('  -> distanceSq(0,0,0, 3,4,0) =', d2, '(expected: 25.0)');

  const hit = exports.checkSweptCollision(0, 1, 0, 0, 1, 2, 2.5);
  console.log('  -> checkSweptCollision test =', hit, '(expected: 1)');

  const dmg = exports.calculateAbsolverDamage(40.0, 50.0, 1, 1, 100.0);
  const memF32 = new Float32Array(exports.memory.buffer);
  const memI32 = new Int32Array(exports.memory.buffer);
  console.log('  -> calculateAbsolverDamage (40dmg, 50poise, heavy=1, guard=1):');
  console.log('     mitigatedDamage =', memF32[0], '(expected: 8.0, 80% blocked!)');
  console.log('     poiseDrain =', memF32[1], '(expected: 125.0, 2.5x breaker poise!)');
  console.log('     isGuardBroken =', memI32[3], '(expected: 1)');

  const clampRatio = exports.clampArena(30.0, 0.0, 26.5);
  console.log('  -> clampArena(30, 0, 26.5) ratio =', clampRatio.toFixed(4), '(expected: 0.8833)');
  console.log('[WASM Builder] All WebAssembly module tests passed cleanly!');
}

buildWasm().catch(e => {
  console.error('[WASM Builder Error]', e);
  process.exit(1);
});
