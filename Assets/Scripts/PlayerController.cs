using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

public class PlayerController : MonoBehaviour
{
    public InputActionAsset playerInputActionAsset = null;
    public Vector2 velocity = Vector2.zero;
    public float jumpHeight = 10.0f;
    public float gravity = 0.0f;
    public float jumpVelocity = 20.0f;
    public float groundHeight = 10.0f;
    
    private InputActionMap _playerInputActionMap = null;
    private InputAction _jumpInputAction = null;
    private InputAction _selectToolsInputAciton = null;
    private InputAction _interactInputAction = null;
    private Rigidbody2D _rigidBody = null;

    private bool _isGrounded = true;
    private void Awake()
    {
        _playerInputActionMap = playerInputActionAsset.FindActionMap("Player");
        _jumpInputAction = _playerInputActionMap.FindAction("Jump");
        _selectToolsInputAciton = _playerInputActionMap.FindAction("SelectTools");
        _interactInputAction = _playerInputActionMap.FindAction("Interact");
        _rigidBody = GetComponent<Rigidbody2D>();
    }

    private void OnEnable()
    {
        _jumpInputAction.Enable();
        _selectToolsInputAciton.Enable();
        _interactInputAction.Enable();

        _jumpInputAction.performed += OnJumpPerformed;
        _jumpInputAction.canceled += OnJumpCancelled;

    }

    private void OnDisable()
    {
        _jumpInputAction.Disable();
        _selectToolsInputAciton.Disable();
        _interactInputAction.Disable();
        
        _jumpInputAction.performed -= OnJumpPerformed;
        _jumpInputAction.canceled -= OnJumpCancelled;

    }

    private void FixedUpdate()
    {
    }

    private void OnJumpPerformed(InputAction.CallbackContext context)
    {
        Vector2 pos = transform.position;
        if (_isGrounded)
        {
            // _rigidBody.AddForce(Vector2.up * jumpHeight);
            // Debug.Log($"Jump performed! {Vector2.up.ToString()} {jumpHeight.ToString()}");
        }
            
    }

    private void OnJumpCancelled(InputAction.CallbackContext context)
    {
        _rigidBody.AddForce(Vector2.zero);
        // Debug.Log($"Jump cancelled!");
    }
    private void OnCollisionEnter2D(Collision2D other)
    {
        if (other.gameObject.CompareTag("Ground"))
            _isGrounded = true;
    }

    private void OnCollisionExit2D(Collision2D other)
    {
        if(other.gameObject.CompareTag("Ground"))
            _isGrounded = false;
    }
}
